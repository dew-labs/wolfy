import {
    cairoIntToBigInt,
    createCall,
    executeAndWait,
    getProvider,
    OrderType,
    parseOrderType,
    ProviderType,
    SatoruEvent,
    toStarknetHexString,
    type SatoruEventHandler,
} from "satoru-sdk";
import type { Emitter } from "nanoevents";
import pRetry from "p-retry";

import { createLogger } from "@/shared/utils/logger";
import { getDataStoreContract } from "@/shared/utils/helpers";
import {
    executeOrder as executeOrderUtil,
    getNetworkConfig,
    measureExecutionTime,
} from "@/shared/utils/utils";
import type { Order } from "@/shared/interfaces/Order";
import { getExchangeRouterContract } from "@/shared/utils/contracts/getters";
import { EventHandlerTypes } from "@/shared/interfaces/Events";

import {
    onPositionIncreasedHandler,
    onPositionDecreasedHandler,
} from "../eventHandlers/positionEventHandler";
import { saveOrder, removeOrder, loadOrders } from "../services/orderPersistenceService";
import { getOraclePrice } from "../services/pythPriceOracleService";

const logger = createLogger("OrderExecutionKeeper");

const isLimitOrderExecutable = (order: Order, executionPrice: bigint): boolean => {
    const acceptablePrice = order.acceptablePrice;
    return order.isLong ? executionPrice <= acceptablePrice : executionPrice >= acceptablePrice;
};

const isMarketOrder = (orderType: OrderType): boolean =>
    [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(orderType);

// TODO: immutable
const addExecutingLimitOrder = (
    orderKey: string,
    executingLimitOrders: Set<string>
): Set<string> => {
    return executingLimitOrders.add(orderKey);
};

// TODO: immutable
const removeExecutingLimitOrder = (
    orderKey: string,
    executingLimitOrders: Set<string>
): Set<string> => {
    executingLimitOrders.delete(orderKey);
    return executingLimitOrders;
};

const isExecutingLimitOrder = (orderKey: string, executingLimitOrders: Set<string>): boolean => {
    return executingLimitOrders.has(orderKey);
};

export function createOrderExecutionKeeper(emitter: Emitter) {
    const { account, chainId } = getNetworkConfig();

    const dataStoreContract = getDataStoreContract(chainId, account);
    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    let executingLimitOrders = new Set<string>();

    const onPriceChangedHandler = async (indexTokenAddress: string, oraclePrice: bigint) => {
        const limitOrders: Record<string, Order[]> = loadOrders();
        if (!limitOrders[indexTokenAddress] || limitOrders[indexTokenAddress].length === 0) return;

        await executeLimitOrdersIfExecutable(
            limitOrders[indexTokenAddress],
            indexTokenAddress,
            oraclePrice
        );
    };

    const onOrderCreatedHandler: SatoruEventHandler<SatoruEvent.OrderCreated> = async (event) => {
        const {
            key,
            order_type,
            market: marketKey,
            trigger_price,
            acceptable_price,
            is_long,
            size_delta_usd,
        } = event.order;

        const orderKey = toStarknetHexString(key);
        const marketKeyString = toStarknetHexString(marketKey);
        const orderType = parseOrderType(order_type);
        const triggerPrice = cairoIntToBigInt(trigger_price);
        const acceptablePrice = cairoIntToBigInt(acceptable_price);
        const sizeDeltaUsd = cairoIntToBigInt(size_delta_usd);

        const market = await dataStoreContract.get_market(marketKey);
        const indexTokenAddress = toStarknetHexString(market.index_token);

        const order: Order = {
            key: orderKey,
            market: marketKeyString,
            orderType,
            isLong: is_long,
            sizeDeltaUsd,
            triggerPrice,
            acceptablePrice,
        };

        if (isMarketOrder(orderType)) {
            await executeOrder(order);
        } else {
            const executionIndexPrice = getOraclePrice(indexTokenAddress);

            if (isLimitOrderExecutable(order, executionIndexPrice)) {
                await executeOrder(order);
            } else {
                saveOrder(order, indexTokenAddress);
            }
        }
    };

    const onOrderCancelledHandler: SatoruEventHandler<SatoruEvent.OrderCancelled> = async (
        event
    ) => {
        const { key, reason } = event;

        const orderKey = toStarknetHexString(key);

        cancelOrder(orderKey);
    };

    const executeOrder = async (order: Order): Promise<void> => {
        return await measureExecutionTime(async () => {
            const market = await dataStoreContract.get_market(order.market);
            const indexTokenAddress = toStarknetHexString(market.index_token);
            const longTokenAddress = toStarknetHexString(market.long_token);
            const shortTokenAddress = toStarknetHexString(market.short_token);

            let shouldCancel = false;
            try {
                await pRetry(
                    async () => {
                        const executionIndexPrice = getOraclePrice(indexTokenAddress);
                        const executionLongPrice = getOraclePrice(longTokenAddress);
                        const executionShortPrice = getOraclePrice(shortTokenAddress);

                        await executeOrderUtil(
                            account,
                            order,
                            indexTokenAddress,
                            longTokenAddress,
                            shortTokenAddress,
                            executionIndexPrice,
                            executionLongPrice,
                            executionShortPrice
                        );
                    },
                    { retries: 3, minTimeout: 0 }
                );
            } catch (error) {
                logger.error(error, `Order ${order.key}: Failed to execute`);
                if (isMarketOrder(order.orderType)) {
                    shouldCancel = true;
                }
            }

            if (shouldCancel) {
                await cancelOrder(order.key);
            }
        }, `${order.orderType} Order ${order.key}: Executed`);
    };

    const cancelOrder = async (orderKey: string): Promise<void> => {
        return await measureExecutionTime(async () => {
            logger.info(`Order ${orderKey}: Canceling ...`);

            try {
                const executeOrderReceipt = await executeAndWait(
                    account,
                    createCall(exchangeRouterContract, "cancel_order", [orderKey])
                );

                if (!executeOrderReceipt.isSuccess()) {
                    throw new Error("Order cancellation failed");
                }
            } catch (error) {
                logger.error(error, `Order ${orderKey}: Failed to cancel`);
                throw error;
            }
        }, `Order ${orderKey}: Cancelled`);
    };

    const executeLimitOrdersIfExecutable = async (
        limitOrders: Order[],
        indexTokenAddress: string,
        executionPrice: bigint
    ) => {
        Promise.allSettled(
            limitOrders.map(async (order) => {
                if (isExecutingLimitOrder(order.key, executingLimitOrders)) return;

                executingLimitOrders = addExecutingLimitOrder(order.key, executingLimitOrders);

                if (isLimitOrderExecutable(order, executionPrice)) {
                    try {
                        await executeOrder(order);
                        executingLimitOrders = removeExecutingLimitOrder(
                            order.key,
                            executingLimitOrders
                        );
                        removeOrder(order.key, indexTokenAddress);
                    } catch (error) {
                        logger.error(error, `Order ${order.key}: Failed to execute`);
                    }
                }
            })
        );
    };

    const run = async () => {
        try {
            const wssProvider = getProvider(ProviderType.WSS, chainId);
            wssProvider.onClose(run);

            emitter.on(EventHandlerTypes.PriceChanged, onPriceChangedHandler);

            await wssProvider.subscribeToEvent(SatoruEvent.OrderCreated, onOrderCreatedHandler);
            await wssProvider.subscribeToEvent(SatoruEvent.OrderCancelled, onOrderCancelledHandler);

            await wssProvider.subscribeToEvent(
                SatoruEvent.PositionIncrease,
                onPositionIncreasedHandler
            );
            await wssProvider.subscribeToEvent(
                SatoruEvent.PositionDecrease,
                onPositionDecreasedHandler
            );
        } catch (error) {
            logger.error(error, "Failed to start");
            throw error;
        }
    };

    return { run };
}
