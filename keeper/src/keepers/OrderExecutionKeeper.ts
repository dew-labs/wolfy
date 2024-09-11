import {
    cairoIntToBigInt,
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

import { logger } from "@/shared/utils/logger";
import { getDataStoreContract } from "@/shared/utils/helpers";
import { executeOrder } from "@/shared/utils/utils";
import { EventHandlerTypes } from "@/shared/utils/config";
import type { Order } from "@/shared/interfaces/Order";
import type { Position } from "@/shared/interfaces/Position";

import { PythPriceOracleService } from "../services/PythPriceOracleService";
import { OrderPersistenceService } from "../services/OrderPersistenceService";
import {
    savePosition,
    getPosition,
    removePosition,
    updatePosition,
} from "../services/positionPersistenceService";
import { createPositionEventHandler } from "../eventHandlers/positionEventHandler";

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
        this.positionEventHandler = createPositionEventHandler(emitter);
        this.start();
    }

    async start() {
        this.wssProvider = getProvider(ProviderType.WSS, this.chainId);
        this.wssProvider.onClose(this.onCloseHandler);
        this.emitter.on(
            EventHandlerTypes.executeLimitOrdersIfExecutable,
            this.executeLimitOrdersIfExecutable
        );

        // Subscribe to events
        await this.wssProvider.subscribeToEvent(SatoruEvent.OrderCreated, this.handleOrderCreated);
        await this.wssProvider.subscribeToEvent(
            SatoruEvent.PositionIncrease,
            this.positionEventHandler.handlePositionIncrease
        );
        await this.wssProvider.subscribeToEvent(
            SatoruEvent.PositionDecrease,
            this.positionEventHandler.handlePositionDecrease
        );
    }

    onCloseHandler() {
        logger.info("[OrderKeeper] Restarting ...");
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
                // Store to json
                this.orderPersistenceService.saveOrder(order, indexTokenAddress);
                logger.info(`[${order.orderType}][${order.key}] Saved ...`);
            }
        }
    };

    async executeOrder(order: Order) {
        const market = await this.dataStoreContract.get_market(order.market);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);
        const longTokenAddress: string = toStarknetHexString(market.long_token);
        const shortTokenAddress: string = toStarknetHexString(market.short_token);

        // Get oracle price
        try {
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
        } catch (e) {
            if (this.isMarketOrder(order.orderType)) {
                // TODO: handle cancel market order
                logger.error(e);
            } else {
            }
        }
    }

    // TODO: handle cancel order
    async cancelOrder() {}

    private executeLimitOrdersIfExecutable = (
        limitOrders: Order[],
        indexTokenAddress: string,
        executionPrice: bigint
    ) => {
        limitOrders.forEach(async (order) => {
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
        });
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
