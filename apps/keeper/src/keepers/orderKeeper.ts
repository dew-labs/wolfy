import type { Emitter } from "nanoevents";
import pRetry from "p-retry";
import {
    cairoIntToBigInt,
    getProvider,
    OrderType,
    parseOrderType,
    ProviderType,
    SatoruContract,
    SatoruEvent,
    toStarknetHexString,
    type SatoruContractAbi,
    type SatoruEventHandler,
} from "satoru-sdk";

import {
    createLogger,
    executeOrder as utilExecuteOrder,
    getNetworkConfig,
    measureExecutionTime,
    getTokenAddressToOrdersMap,
    setTokenAddressToOrdersMap,
    isMarketOrder,
    getMarket,
    isLiquidationOrder,
} from "@freyr/shared/utils";

import { getDataStoreContract } from "@freyr/shared/contracts";

import { EventHandlerTypes, type Order } from "@freyr/shared/interfaces";

import { getOraclePrice } from "../services/pythPriceOracleService";
import { fetchCreatedTriggerOrders } from "../graphql/services/orderService";
import type { TypedContractV2 } from "starknet";

const logger = createLogger("OrderExecutionKeeper");

const shouldTrigerOrderExecution = (order: Order, latestPrice: bigint): boolean => {
    const triggerPrice = order.triggerPrice;
    if (!triggerPrice) {
        logger.error(`Order ${order.key}: No trigger price`);
        return false;
    }

    switch (order.orderType) {
        case OrderType.LimitIncrease: // Open Position
            return order.isLong ? latestPrice <= triggerPrice : latestPrice >= triggerPrice;
        case OrderType.StopLossDecrease: // Stop Loss
            return order.isLong ? latestPrice <= triggerPrice : latestPrice >= triggerPrice;
        case OrderType.LimitDecrease: // Take Profit
            return order.isLong ? latestPrice >= triggerPrice : latestPrice <= triggerPrice;
        default:
            return false;
    }
};

const isOrderExecutable = (order: Order, executionPrice: bigint): boolean => {
    const acceptablePrice = order.acceptablePrice;

    switch (order.orderType) {
        case OrderType.LimitIncrease: // Open Position
            return order.isLong
                ? executionPrice <= acceptablePrice
                : executionPrice >= acceptablePrice;
        case OrderType.StopLossDecrease: // Stop Loss
            return order.isLong
                ? executionPrice <= acceptablePrice
                : executionPrice >= acceptablePrice;
        case OrderType.LimitDecrease: // Take Profit
            return order.isLong
                ? executionPrice >= acceptablePrice
                : executionPrice <= acceptablePrice;
        default:
            return false;
    }
};

const addExecutingLimitOrder = (
    orderKey: string,
    executingLimitOrders: Set<string>
): Set<string> => {
    return new Set(executingLimitOrders).add(orderKey);
};

const removeExecutingLimitOrder = (
    orderKey: string,
    executingLimitOrders: Set<string>
): Set<string> => {
    const newExecutingLimitOrders = new Set(executingLimitOrders);
    newExecutingLimitOrders.delete(orderKey);
    return newExecutingLimitOrders;
};

const addCreatedTriggerOrder = (order: Order, indexTokenAddress: string): void => {
    const tokenAddressToOrdersMap = getTokenAddressToOrdersMap();
    if (!tokenAddressToOrdersMap[indexTokenAddress]) {
        tokenAddressToOrdersMap[indexTokenAddress] = [];
    }
    tokenAddressToOrdersMap[indexTokenAddress].push(order);
    setTokenAddressToOrdersMap(tokenAddressToOrdersMap);
};

const removeCreatedTriggerOrder = (orderKey: string, indexTokenAddress?: string): void => {
    const tokenAddressToOrdersMap = getTokenAddressToOrdersMap();

    Object.keys(tokenAddressToOrdersMap).forEach((tokenAddress) => {
        const orders = tokenAddressToOrdersMap[tokenAddress];
        if (!orders) return;
        tokenAddressToOrdersMap[tokenAddress] = orders.filter((order) => order.key !== orderKey);
    });

    setTokenAddressToOrdersMap(tokenAddressToOrdersMap);
};

const isExecutingLimitOrder = (orderKey: string, executingLimitOrders: Set<string>): boolean => {
    return executingLimitOrders.has(orderKey);
};

const initializeCreatedTriggerOrders = async (
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>
): Promise<void> => {
    const createdTriggerOrders = await fetchCreatedTriggerOrders();

    const tokenAddressToOrdersMap = getTokenAddressToOrdersMap();
    createdTriggerOrders.forEach(async (order) => {
        const market = await getMarket(dataStoreContract, order.market);
        const indexTokenAddress = toStarknetHexString(market.index_token);
        if (!tokenAddressToOrdersMap[indexTokenAddress]) {
            tokenAddressToOrdersMap[indexTokenAddress] = [];
        }
        tokenAddressToOrdersMap[indexTokenAddress].push(order);
    });
    setTokenAddressToOrdersMap(tokenAddressToOrdersMap);
};

export function createOrderKeeper(emitter: Emitter) {
    const { account, chainId } = getNetworkConfig();

    const dataStoreContract = getDataStoreContract(chainId, account);

    let executingLimitOrders = new Set<string>();
    initializeCreatedTriggerOrders(dataStoreContract);

    const onPriceChangedHandler = async (indexTokenAddress: string, oraclePrice: bigint) => {
        const tokenAddressToOrdersMap = getTokenAddressToOrdersMap();
        if (
            !tokenAddressToOrdersMap[indexTokenAddress] ||
            tokenAddressToOrdersMap[indexTokenAddress].length === 0
        )
            return;

        await executeLimitOrdersIfExecutable(
            tokenAddressToOrdersMap[indexTokenAddress],
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

        if (isLiquidationOrder(orderType)) {
            return;
        }

        // TODO: call to indexer to get market
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
            const latestPrice = getOraclePrice(indexTokenAddress);

            if (shouldTrigerOrderExecution(order, latestPrice)) {
                await executeOrder(order);
            } else {
                addCreatedTriggerOrder(order, indexTokenAddress);
            }
        }
    };

    const onOrderCancelledHandler: SatoruEventHandler<SatoruEvent.OrderCancelled> = async (
        event
    ) => {
        const { key } = event;

        const orderKey = toStarknetHexString(key);

        removeCreatedTriggerOrder(orderKey);
    };

    const executeOrder = async (order: Order): Promise<void> => {
        return await measureExecutionTime(async () => {
            const market = await dataStoreContract.get_market(order.market);
            const indexTokenAddress = toStarknetHexString(market.index_token);
            const longTokenAddress = toStarknetHexString(market.long_token);
            const shortTokenAddress = toStarknetHexString(market.short_token);

            try {
                await pRetry(
                    async () => {
                        // TODO: execution prices should be the oracle price at the block timestamp, not latest (for market order only)
                        const executionIndexPrice = getOraclePrice(indexTokenAddress);
                        isOrderExecutable(order, executionIndexPrice);

                        const executionLongPrice = getOraclePrice(longTokenAddress);
                        const executionShortPrice = getOraclePrice(shortTokenAddress);

                        await utilExecuteOrder(
                            order,
                            indexTokenAddress,
                            longTokenAddress,
                            shortTokenAddress,
                            executionIndexPrice,
                            executionLongPrice,
                            executionShortPrice
                        );
                    },
                    // TODO: put options to somewhere else
                    {
                        retries: 3,
                        onFailedAttempt: (error) => {
                            logger.error(
                                `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`
                            );
                            logger.error(error.message);
                        },
                        minTimeout: 0,
                        maxTimeout: 0,
                    }
                );
            } catch (error) {
                logger.error(error, `Order ${order.key}: Failed to execute`);
            }
        }, `${order.orderType} Order ${order.key}: Executed`);
    };

    const executeLimitOrdersIfExecutable = async (
        limitOrders: Order[],
        indexTokenAddress: string,
        latestPrice: bigint
    ) => {
        Promise.allSettled(
            limitOrders.map(async (order) => {
                if (isExecutingLimitOrder(order.key, executingLimitOrders)) return;

                if (shouldTrigerOrderExecution(order, latestPrice)) {
                    try {
                        executingLimitOrders = addExecutingLimitOrder(
                            order.key,
                            executingLimitOrders
                        );
                        await executeOrder(order);
                        executingLimitOrders = removeExecutingLimitOrder(
                            order.key,
                            executingLimitOrders
                        );
                        removeCreatedTriggerOrder(order.key, indexTokenAddress);
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

            await wssProvider.subscribeTo(SatoruEvent.OrderCreated, onOrderCreatedHandler);
            await wssProvider.subscribeTo(SatoruEvent.OrderCancelled, onOrderCancelledHandler);
        } catch (error) {
            logger.error(error, "Failed to start");
            throw error;
        }
    };

    return { run };
}
