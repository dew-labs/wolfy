import { orders, positions } from "apps/backend/drizzle/schema";
import { lower } from "apps/backend/drizzle/utils";
import { isNotEmptyArray } from "apps/backend/src/utils/utils";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { TradeHistoryQuery, TradeHistoryResponse } from "../models/trade-history.model";
import type { Orm } from "../orm";

export const tradeHistoryTables = [orders, positions] as const;
export type TradeHistoryTable = (typeof tradeHistoryTables)[number];

type TradeHistoryQueryWithoutPagination = {
    [k in keyof Omit<TradeHistoryQuery, "page" | "limit" | "actions" | "markets">]:
        | Omit<TradeHistoryQuery, "page" | "limit" | "actions" | "markets">[k]
        | undefined;
} & {
    actions: number[];
    markets: string[];
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
    market: table.market,
    action: table.action,
    isLong: table.isLong,
    price:
        "triggerPrice" in table
            ? sql<string>`${table.triggerPrice}`.as("price")
            : sql<string>`${table.executionPrice}`.as("price"),
    acceptablePrice:
        "acceptablePrice" in table
            ? sql<string>`${table.acceptablePrice}`.as("acceptablePrice")
            : sql<null>`null`.as("acceptablePrice"),
    collateralToken:
        "initialCollateralToken" in table
            ? sql<string>`${table.initialCollateralToken}`.as("collateralToken")
            : sql<string>`${table.collateralToken}`.as("collateralToken"),
    collateralAmount:
        "collateralAmount" in table
            ? sql<string>`${table.collateralAmount}`.as("collateralAmount")
            : sql<null>`null`.as("collateralAmount"),
    collateralDeltaAmount:
        "initialCollateralDeltaAmount" in table
            ? sql<string>`${table.initialCollateralDeltaAmount}`.as("collateralDeltaAmount")
            : sql<string>`${table.collateralDeltaAmount}`.as("collateralDeltaAmount"),
    size: table.sizeDeltaUsd,
    rpnl:
        "basePnlUsd" in table
            ? sql<string>`${table.basePnlUsd}`.as("rpnl")
            : sql<null>`null`.as("rpnl"),
    fee:
        "executionFee" in table
            ? sql<string>`${table.executionFee}`.as("fee")
            : sql<null>`null`.as("fee"),
    createdAt: table.createdAt,
});

const buildQueryPlaceholder = ({
    actions,
    markets,
    from,
    to,
    isLong,
}: TradeHistoryQueryWithoutPagination) => ({
    ...(isNotEmptyArray(actions) && { actions }),
    ...(isNotEmptyArray(markets) && { markets }),
    ...(from && { from }),
    ...(to && { to }),
    ...(isLong !== undefined && { isLong }),
});

const buildFilters =
    ({ actions, markets, from, to, isLong }: TradeHistoryQueryWithoutPagination) =>
    (table: TradeHistoryTable) =>
        [
            buildAccountFilter(table),
            isNotEmptyArray(markets) ? buildMarketFilter(table) : null,
            isNotEmptyArray(actions) ? buildActionFilter(table) : null,
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
