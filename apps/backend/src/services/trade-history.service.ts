import { and, eq, inArray, or, SQL } from "drizzle-orm";
import { OrderType } from "satoru-sdk";
import { orders } from "../../drizzle/schema";
import type { TradeHistoryQuery } from "../models/trade-history.model";
import { type Orm } from "../orm";

export const getTradeHistory = async (
    orm: Orm,
    {
        marketOrders,
        limitOrders,
        takeProfitOrders,
        stopLossOrders,
        liquidation,
        deposit,
        withdraw,
    }: TradeHistoryQuery
) => {
    const filters = [];
    if (marketOrders) {
        filters.push(getMarketOrdersFilter(marketOrders));
    }
    if (liquidation) {
        filters.push(eq(orders.orderType, OrderType.Liquidation));
    }
    return orm.query.orders.findMany({
        columns: {
            id: true,
            triggerPrice: true,
            sizeDeltaUsd: true,
            orderType: true,
            isExecuted: true
        },
        where: or(...filters),
    });
};

const getMarketOrdersFilter = (marketOrders: string) => {
    const actions = marketOrders.split(",");
    if (actions.includes("all")) {
        return inArray(orders.orderType, [OrderType.MarketDecrease, OrderType.MarketIncrease]);
    }
    return or(marketOrderFilter(actions), requestMarketOrderFilter(actions));
};

const marketOrderFilter = (actions: string[]) => {
    const filters: SQL[] = [];
    const marketActionToType = {
        increase: OrderType.MarketIncrease,
        decrease: OrderType.MarketDecrease,
    };
    type AvailableMarketActions = keyof typeof marketActionToType;
    const marketFilter = actions.filter((action) => action in marketActionToType);
    if (marketFilter.length > 0) {
        filters.push(
            inArray(
                orders.orderType,
                marketFilter.map((action) => marketActionToType[action as AvailableMarketActions])
            )
        );
        filters.push(eq(orders.isExecuted, true));
    }
    return and(...filters);
};

const requestMarketOrderFilter = (actions: string[]) => {
    const filters: SQL[] = [];
    const requestActionToType = {
        requestIncrease: OrderType.MarketIncrease,
        requestDecrease: OrderType.MarketDecrease,
    };
    type AvailableRequestActions = keyof typeof requestActionToType;
    const requestFilter = actions.filter((action) => action in requestActionToType);
    if (requestFilter.length > 0) {
        filters.push(
            inArray(
                orders.orderType,
                requestFilter.map(
                    (action) => requestActionToType[action as AvailableRequestActions]
                )
            )
        );
        filters.push(eq(orders.isExecuted, false));
    }
    return and(...filters);
};
