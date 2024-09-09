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

import { getDataStoreContract } from "@/shared/utils/helpers";
import type { Account, TypedContractV2 } from "starknet";
import type { Order } from "@/shared/interfaces/Order";
import type { PythPriceOracleService } from "../services/PythPriceOracleService";
import { OrderPersistenceService } from "../services/OrderPersistenceService";
import { executeOrder } from "@/shared/utils/utils";
import { logger } from "@/shared/utils/logger";
import type { Emitter } from "nanoevents";

export class OrderKeeper {
    private readonly dataStoreContract: TypedContractV2<
        SatoruContractAbi<SatoruContract.DataStore>
    >;
    private wssProvider?: SatoruWebSocketProvider;
    private readonly orderPersistenceService: OrderPersistenceService;
    private executingLimitOrders: Set<string>;

    constructor(
        private priceOracleService: PythPriceOracleService,
        private account: Account,
        private chainId: StarknetChainId,
        private emitter: Emitter
    ) {
        this.dataStoreContract = getDataStoreContract(chainId, account);
        this.orderPersistenceService = new OrderPersistenceService();
        this.executingLimitOrders = new Set();
        this.start();
    }

    async start() {
        this.wssProvider = getProvider(ProviderType.WSS, this.chainId);
        await this.wssProvider.subscribeToEvent(SatoruEvent.OrderCreated, this.handleOrderCreated);
        this.wssProvider.onClose(this.onCloseHandler);
        this.emitter.on("executeLimitOrders", this.executeLimitOrders);
    }

    onCloseHandler() {
        console.log("restart");
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
        } = event.order;

        // init data
        const orderKey: string = toStarknetHexString(key);
        const orderType: OrderType = parseOrderType(order_type);
        const triggerPrice: bigint = cairoIntToBigInt(trigger_price);
        const acceptablePrice: bigint = cairoIntToBigInt(acceptable_price);

        const market = await this.dataStoreContract.get_market(marketKey);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);

        const order: Order = {
            key: orderKey,
            market: marketKey.toString(), // still receive bigint if not convert
            order_type: orderType,
            trigger_price: triggerPrice,
            acceptable_price: acceptablePrice,
            is_long,
        };
        if (
            [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(
                orderType
            )
        ) {
            // Market Order
            await this.executeOrder(order);
        } else {
            // Limit Order

            // Execute right away if oracle price match
            const executionIndexPrice: bigint =
                this.priceOracleService.getOraclePrice(indexTokenAddress);

            if (this.canExecuteLimitOrder(order, executionIndexPrice)) {
                // TODO: execute in child process
                await this.executeOrder(order);
                this.executingLimitOrders.delete(order.key);
                this.orderPersistenceService.deleteOrder(order.key, indexTokenAddress);
            } else {
                // Store to json
                this.orderPersistenceService.saveOrder(order, indexTokenAddress);
                logger.info(`[${order.order_type}][${order.key}] Saved ...`);
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
        } catch {
            // TODO: call cancel order
        }
    }

    async cancelOrder() {}

    private executeLimitOrders = (
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

            if (this.canExecuteLimitOrder(order, executionPrice)) {
                // TODO: execute in child process
                await this.executeOrder(order);
                this.executingLimitOrders.delete(order.key);
                this.orderPersistenceService.deleteOrder(order.key, indexTokenAddress);
            }
        });
    };

    private canExecuteLimitOrder(order: Order, executionPrice: bigint): boolean {
        const acceptablePrice: bigint = order.acceptable_price;

        if (order.is_long) {
            return executionPrice <= acceptablePrice;
        } else {
            return executionPrice >= acceptablePrice;
        }

        return true;
    }
}
