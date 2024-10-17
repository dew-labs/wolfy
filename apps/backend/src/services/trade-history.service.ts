import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { tradehistories } from "../../drizzle/schema";
import type { TradeHistoryQuery, TradeHistoryResponse } from "../models/trade-history.model";
import type { Orm } from "../orm";

export const getTradeHistory = async (
    orm: Orm,
    address: string,
    { actions, markets, from, to, page, limit, isLong }: TradeHistoryQuery
): Promise<TradeHistoryResponse> => {
    const filters = [eq(tradehistories.account, address)];

    if (actions) {
        const actionFilter = actions
            .split(",")
            .map((action) => parseInt(action))
            .filter((action) => !isNaN(action));

        filters.push(inArray(tradehistories.action, actionFilter));
    }

    if (markets) {
        filters.push(inArray(tradehistories.market, markets.split(",")));
    }

    if (from) {
        filters.push(gte(tradehistories.createdAt, from));
    }

    if (to) {
        filters.push(lte(tradehistories.createdAt, to));
    }

    if (isLong !== undefined) {
        filters.push(eq(tradehistories.isLong, isLong));
    }

    const [count, tradeHistory] = await Promise.all([
        orm.$count(tradehistories, and(...filters)),
        orm.query.tradehistories.findMany({
            columns: {
                id: true,
                orderPrice: true,
                orderSizeUsd: true,
                depositLongTokenAmount: true,
                depositShortTokenAmount: true,
                poolMarketTokenAmount: true,
                isLong: true,
                action: true,
                market: true,
            },
            where: and(...filters),
            orderBy: desc(tradehistories.createdAt),
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
