import { orders, positions } from "apps/backend/drizzle/schema";
import { lower } from "apps/backend/drizzle/utils";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { TradeHistoryQuery, TradeHistoryResponse } from "../models/trade-history.model";
import type { Orm } from "../orm";

export const tradeHistoryTables = [orders, positions] as const;
export type TradeHistoryTable = (typeof tradeHistoryTables)[number];

type TradeHistoryQueryWithoutPagination = {
    [k in keyof Omit<TradeHistoryQuery, "page" | "limit">]:
        | Omit<TradeHistoryQuery, "page" | "limit">[k]
        | undefined;
};

export const getTradeHistory = async (
    orm: Orm,
    address: string,
    { actions, markets, from, to, page, limit, isLong }: TradeHistoryQuery
): Promise<TradeHistoryResponse> => {
    const filterBuilder = buildFilters({ actions, markets, from, to, isLong });

    const baseTradeHistoryQuery = orm
        .select(buildSelectClause(orders))
        .from(orders)
        .where(and(...filterBuilder(orders)))
        .unionAll(
            orm
                .select(buildSelectClause(positions))
                .from(positions)
                .where(and(...filterBuilder(positions)))
        )
        .as("tradeHistories");

    const countQuery = orm
        .select({ count: sql<string>`count(*)` })
        .from(baseTradeHistoryQuery)
        .prepare("tradeHistoryService.countTradeHistory");

    const tradeHistoryQuery = orm
        .select()
        .from(baseTradeHistoryQuery)
        .orderBy(desc(sql`created_at`))
        .offset(sql.placeholder("offset"))
        .limit(sql.placeholder("limit"))
        .prepare("tradeHistoryService.getTradeHistory");

    const [countData, tradeHistory] = await Promise.all([
        countQuery.execute({
            ...buildQueryPlaceholder({ actions, markets, from, to, isLong }),
            account: address,
        }),
        tradeHistoryQuery.execute({
            ...buildQueryPlaceholder({ actions, markets, from, to, isLong }),
            account: address,
            limit,
            offset: (page - 1) * limit,
        }),
    ]);

    const count = countData[0] && countData[0].count ? parseInt(countData[0].count) : 0;

    return {
        data: tradeHistory,
        count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
    };
};

const buildSelectClause = (table: TradeHistoryTable) => ({
    id: table.uid,
    price:
        "triggerPrice" in table
            ? sql<string>`${table.triggerPrice}`.as("price")
            : sql<string>`${table.executionPrice}`.as("price"),
    size: table.sizeDeltaUsd,
    isLong: table.isLong,
    action: table.action,
    market: table.market,
    created_at: table.createdAt,
});

const buildQueryPlaceholder = ({
    actions,
    markets,
    from,
    to,
    isLong,
}: TradeHistoryQueryWithoutPagination) => ({
    ...(actions && {
        actions: actions
            .split(",")
            .map((action) => parseInt(action))
            .filter((action) => !isNaN(action)),
    }),
    ...(markets && { markets: markets.split(",") }),
    ...(from && { from }),
    ...(to && { to }),
    ...(isLong !== undefined && { isLong }),
});

const buildFilters =
    ({ actions, markets, from, to, isLong }: TradeHistoryQueryWithoutPagination) =>
    (table: TradeHistoryTable) =>
        [
            buildAccountFilter(table),
            markets ? buildMarketFilter(table) : null,
            actions ? buildActionFilter(table) : null,
            from ? buildFromDateFilter(table) : null,
            to ? buildToDateFilter(table) : null,
            isLong !== undefined ? buildDirectionFilter(table) : null,
        ].filter((f) => !!f);

const buildAccountFilter = (table: TradeHistoryTable) =>
    eq(lower(table.account), sql.placeholder("account"));

const buildMarketFilter = (table: TradeHistoryTable) =>
    eq(lower(table.market), sql`any(${sql.placeholder("markets")}::varchar[])`);

const buildDirectionFilter = (table: TradeHistoryTable) =>
    eq(table.isLong, sql.placeholder("isLong"));

const buildActionFilter = (table: TradeHistoryTable) =>
    eq(table.action, sql`any(${sql.placeholder("actions")}::integer[])`);

const buildFromDateFilter = (table: TradeHistoryTable) =>
    gte(table.createdAt, sql.placeholder("from"));

const buildToDateFilter = (table: TradeHistoryTable) => lte(table.createdAt, sql.placeholder("to"));
