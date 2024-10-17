import { and, desc, gte, inArray, isNotNull, lte, or } from "drizzle-orm";
import { orders } from "../../drizzle/schema";
import type { TradeHistoryQuery, TradeHistoryResponse } from "../models/trade-history.model";
import type { Orm } from "../orm";

export const getTradeHistory = async (
    orm: Orm,
    { actions, markets, from, to, page, limit }: TradeHistoryQuery
): Promise<TradeHistoryResponse> => {
    const filters = [isNotNull(orders.action)];

    if (actions) {
        const actionFilter = actions
            .split(",")
            .map((action) => parseInt(action))
            .filter((action) => !isNaN(action));

        filters.push(inArray(orders.action, actionFilter));
    }

    if (markets) {
        filters.push(inArray(orders.market, markets.split(",")));
    }

    if (from) {
        filters.push(gte(orders.createdAt, from));
    }
    if (to) {
        filters.push(lte(orders.createdAt, to));
    }

    const [count, tradeHistory] = await Promise.all([
        orm.$count(orders, or(...filters)),
        orm.query.orders.findMany({
            columns: {
                id: true,
                triggerPrice: true,
                sizeDeltaUsd: true,
                action: true,
                market: true,
            },
            where: and(...filters),
            orderBy: desc(orders.createdAt),
            offset: (page - 1) * limit,
            limit,
        }),
    ]);

    return {
        data: tradeHistory,
        count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
    };
};
