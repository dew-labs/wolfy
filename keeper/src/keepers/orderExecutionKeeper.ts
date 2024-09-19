import {
    cairoIntToBigInt,
    createCall,
    executeAndWait,
    getProvider,
    OrderType,
    parseOrderType,
    ProviderType,
    SatoruContract,
    SatoruEvent,
    StarknetChainId,
    toStarknetHexString,
    type SatoruContractAbi,
    type SatoruEventHandler,
    type SatoruWebSocketProvider,
} from "satoru-sdk";
import type { Account, TypedContractV2 } from "starknet";
import type { Emitter } from "nanoevents";
import pRetry, { type AbortError } from "p-retry";

import { logger } from "@/shared/utils/logger";
import { getDataStoreContract } from "@/shared/utils/helpers";
import { executeOrder } from "@/shared/utils/utils";
import { EventHandlerTypes } from "@/shared/utils/config";
import type { Order } from "@/shared/interfaces/Order";

import { PythPriceOracleService } from "../services/PythPriceOracleService";
import { OrderPersistenceService } from "../services/OrderPersistenceService";
import { createPositionEventHandler } from "../eventHandlers/positionEventHandler";
import { getExchangeRouterContract } from "@/shared/utils/contracts/getters";

export class OrderExecutionKeeper {
    private readonly dataStoreContract: TypedContractV2<
        SatoruContractAbi<SatoruContract.DataStore>
    >;
    private wssProvider?: SatoruWebSocketProvider;
    private readonly orderPersistenceService: OrderPersistenceService;
    private executingLimitOrders: Set<string>;
    private positionEventHandler: ReturnType<typeof createPositionEventHandler>;

    constructor(
        private priceOracleService: PythPriceOracleService,
        private account: Account,
        private chainId: StarknetChainId,
        private emitter: Emitter
    ) {
        this.dataStoreContract = getDataStoreContract(chainId, account);
        this.orderPersistenceService = new OrderPersistenceService();
        this.executingLimitOrders = new Set();
        this.positionEventHandler = createPositionEventHandler();
        this.start();
    }

    async start() {
        this.wssProvider = getProvider(ProviderType.WSS, this.chainId);
        this.wssProvider.onClose(this.onCloseHandler);
        this.emitter.on(
            EventHandlerTypes.executeLimitOrdersIfExecutable,
            this.executeLimitOrdersIfExecutable
        );

        await this.wssProvider.subscribeTo(SatoruEvent.OrderCreated, this.handleOrderCreated);
        await this.wssProvider.subscribeTo(
            SatoruEvent.PositionIncrease,
            this.positionEventHandler.handlePositionIncrease
        );
        await this.wssProvider.subscribeTo(
            SatoruEvent.PositionDecrease,
            this.positionEventHandler.handlePositionDecrease
        );
    }

    onCloseHandler() {
        logger.debug("[OrderKeeper] Restarting ...");
        this.start();
    }

    // TODO: handler for subcribe error

    handleOrderCreated: SatoruEventHandler<SatoruEvent.OrderCreated> = async (event) => {
        const {
            key,
            order_type,
            market: marketKey,
            trigger_price,
            acceptable_price,
            is_long,
            size_delta_usd,
        } = event.order;

        // init data
        const orderKey: string = toStarknetHexString(key);
        const marketKeyString: string = toStarknetHexString(marketKey);
        const orderType: OrderType = parseOrderType(order_type);
        const triggerPrice: bigint = cairoIntToBigInt(trigger_price);
        const acceptablePrice: bigint = cairoIntToBigInt(acceptable_price);
        const sizeDeltaUsd: bigint = cairoIntToBigInt(size_delta_usd);

        const market = await this.dataStoreContract.get_market(marketKey);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);

        const order: Order = {
            key: orderKey,
            market: marketKeyString,
            orderType,
            isLong: is_long,
            sizeDeltaUsd,
            triggerPrice,
            acceptablePrice,
        };
        if (this.isMarketOrder(orderType)) {
            // Market Order
            await this.executeOrder(order);
        } else {
            // Limit Order

            // Execute right away if oracle price match
            const executionIndexPrice: bigint =
                this.priceOracleService.getOraclePrice(indexTokenAddress);

            if (this.isLimitOrderExecutable(order, executionIndexPrice)) {
                // TODO: execute in child process
                await this.executeOrder(order);
            } else {
                this.orderPersistenceService.saveOrder(order, indexTokenAddress);
            }
        }
    };

    async executeOrder(order: Order) {
        const market = await this.dataStoreContract.get_market(order.market);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);
        const longTokenAddress: string = toStarknetHexString(market.long_token);
        const shortTokenAddress: string = toStarknetHexString(market.short_token);

        let shouldCancel = false;
        try {
            await pRetry(
                async () => {
                    const executionIndexPrice: bigint =
                        this.priceOracleService.getOraclePrice(indexTokenAddress);
                    const executionLongPrice: bigint =
                        this.priceOracleService.getOraclePrice(longTokenAddress);
                    const executionShortPrice: bigint =
                        this.priceOracleService.getOraclePrice(shortTokenAddress);

                    // TODO: execute in child process
                    await executeOrder(
                        this.account,
                        order,
                        indexTokenAddress,
                        longTokenAddress,
                        shortTokenAddress,
                        executionIndexPrice,
                        executionLongPrice,
                        executionShortPrice
                    );
                },
                {
                    retries: 3,
                    minTimeout: 0,
                }
            );
        } catch (e) {
            logger.error(`Failed to execute order ${order.key}`);
            if (this.isMarketOrder(order.orderType)) {
                shouldCancel = true;
                logger.info(`Canceling market order ${order.key}...`);
            }
        }

        if (shouldCancel) {
            try {
                await pRetry(
                    async () => {
                        await this.cancelOrder(order.key);
                    },
                    {
                        retries: 3,
                        minTimeout: 0,
                    }
                );
            } catch (e) {
                logger.error(`Failed to cancel order ${order.key}`);
            }
        }
    }

    // TODO: only trader can cancel order, so what if slippage is too high?
    async cancelOrder(orderKey: string) {
        logger.info(`Cancel order ${orderKey}`);

        const exchangeRouterContract = getExchangeRouterContract(this.chainId, this.account);
        const executeOrderReceipt = await executeAndWait(
            this.account,
            createCall(exchangeRouterContract, "cancel_order", [orderKey])
        );

        if (executeOrderReceipt.isSuccess()) {
            logger.info("Order cancelled");
        } else {
            throw new Error("Order cancellation failed");
        }
    }

    private executeLimitOrdersIfExecutable = (
        limitOrders: Order[],
        indexTokenAddress: string,
        executionPrice: bigint
    ) => {
        Promise.allSettled(
            limitOrders.map(async (order) => {
                if (this.executingLimitOrders.has(order.key)) {
                    return;
                } else {
                    this.executingLimitOrders.add(order.key);
                }

                if (this.isLimitOrderExecutable(order, executionPrice)) {
                    // TODO: execute in child process
                    await this.executeOrder(order);
                    this.executingLimitOrders.delete(order.key);
                    this.orderPersistenceService.deleteOrder(order.key, indexTokenAddress);
                }
            })
        );
    };

    private isLimitOrderExecutable(order: Order, executionPrice: bigint): boolean {
        const acceptablePrice: bigint = order.acceptablePrice;

        if (order.isLong) {
            return executionPrice <= acceptablePrice;
        } else {
            return executionPrice >= acceptablePrice;
        }

        return true;
    }

    private isMarketOrder(orderType: OrderType): boolean {
        return [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(
            orderType
        );
    }
}
