import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { deposits, withdrawals } from "@backend/drizzle/schema";
import { lower } from "@backend/drizzle/utils";
import { isNotEmptyArray } from "@backend/src/utils/utils";

import type {
    DepositWithdrawalHistoryQuery,
    DepositWithdrawalHistoryResponse,
} from "@backend/src/models/deposit-withdrawal-history.model";
import type { Orm } from "@backend/src/orm";
import { TradeHistoryAction } from "packages/shared/src/interfaces";

export const depositWithdrawalHistoryTables = [deposits, withdrawals] as const;
export type DepositWithdrawalHistoryTable = (typeof depositWithdrawalHistoryTables)[number];

type DepositWithdrawalHistoryQueryWithoutPagination = {
    [k in keyof Omit<DepositWithdrawalHistoryQuery, "page" | "limit" | "actions" | "markets">]:
        | Omit<DepositWithdrawalHistoryQuery, "page" | "limit" | "actions" | "markets">[k]
        | undefined;
} & {
    actions: number[];
    markets: string[];
};

export const getDepositWithdrawalHistory = async (
    orm: Orm,
    address: string,
    { actions, markets, from, to, page, limit }: DepositWithdrawalHistoryQuery
): Promise<DepositWithdrawalHistoryResponse> => {
    const filterBuilder = buildFilters({ actions, markets, from, to });

    const baseDepositWithdrawalHistoryQuery = orm
        .select(buildSelectClause(deposits))
        .from(deposits)
        .where(and(...filterBuilder(deposits)))
        .unionAll(
            orm
                .select(buildSelectClause(withdrawals))
                .from(withdrawals)
                .where(and(...filterBuilder(withdrawals)))
        )
        .as("depositWithdrawalHistories");

    const countQuery = orm
        .select({ count: sql<string>`count(*)` })
        .from(baseDepositWithdrawalHistoryQuery)
        .prepare("depositWithdrawalHistories.countDeposits");

    const depositQuery = orm
        .select()
        .from(baseDepositWithdrawalHistoryQuery)
        .orderBy(desc(sql`created_at`))
        .offset(sql.placeholder("offset"))
        .limit(sql.placeholder("limit"))
        .prepare("depositWithdrawalHistories.getDepositWithdrawalHistory");

    const [countData, data] = await Promise.all([
        countQuery.execute({
            ...buildQueryPlaceholder({ actions, markets, from, to }),
            account: address,
        }),
        depositQuery.execute({
            ...buildQueryPlaceholder({ actions, markets, from, to }),
            account: address,
            limit,
            offset: (page - 1) * limit,
        }),
    ]);

    const count = countData[0] && countData[0].count ? parseInt(countData[0].count) : 0;

    const result = data.map((d) => {
        switch (d.action) {
            case TradeHistoryAction.RequestDeposit:
            case TradeHistoryAction.CancelDeposit:
                d.longTokenAmount = d.longTokenAmount;
                d.shortTokenAmount = d.shortTokenAmount;
                d.marketTokenAmount = d.minMarketTokenAmount;
                break;
            case TradeHistoryAction.Deposit:
                d.longTokenAmount = d.longTokenAmount;
                d.shortTokenAmount = d.shortTokenAmount;
                d.marketTokenAmount = d.receivedMarketTokenAmount;
                break;
            case TradeHistoryAction.RequestWithdraw:
            case TradeHistoryAction.CancelWithdraw:
                d.longTokenAmount = d.minLongTokenAmount;
                d.shortTokenAmount = d.minShortTokenAmount;
                d.marketTokenAmount = d.marketTokenAmount;
                break;
            case TradeHistoryAction.Withdraw:
                d.longTokenAmount = d.receivedLongTokenAmount;
                d.shortTokenAmount = d.receivedShortTokenAmount;
                d.marketTokenAmount = d.marketTokenAmount;
                break;
        }

        return {
            id: d.id,
            market: d.market,
            action: d.action,
            executionFee: d.executionFee,
            longTokenAmount: d.longTokenAmount,
            shortTokenAmount: d.shortTokenAmount,
            marketTokenAmount: d.marketTokenAmount,
            txHash: d.txHash,
            createdAt: d.createdAt,
        };
    });

    return {
        data: result,
        count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
    };
};

const buildSelectClause = (table: DepositWithdrawalHistoryTable) => ({
    id: table.uid,
    market: table.market,
    action: table.action,
    executionFee: table.executionFee,
    longTokenAmount:
        "longTokenAmount" in table
            ? sql<string>`${table.longTokenAmount}`.as("longTokenAmount")
            : sql<null>`null`.as("longTokenAmount"),
    shortTokenAmount:
        "shortTokenAmount" in table
            ? sql<string>`${table.shortTokenAmount}`.as("shortTokenAmount")
            : sql<null>`null`.as("shortTokenAmount"),
    minLongTokenAmount:
        "minLongTokenAmount" in table
            ? sql<string>`${table.minLongTokenAmount}`.as("minLongTokenAmount")
            : sql<null>`null`.as("minLongTokenAmount"),
    minShortTokenAmount:
        "minShortTokenAmount" in table
            ? sql<string>`${table.minShortTokenAmount}`.as("minShortTokenAmount")
            : sql<null>`null`.as("minShortTokenAmount"),
    receivedLongTokenAmount:
        "receivedLongTokenAmount" in table
            ? sql<string>`${table.receivedLongTokenAmount}`.as("receivedLongTokenAmount")
            : sql<null>`null`.as("receivedLongTokenAmount"),
    receivedShortTokenAmount:
        "receivedShortTokenAmount" in table
            ? sql<string>`${table.receivedShortTokenAmount}`.as("receivedShortTokenAmount")
            : sql<null>`null`.as("receivedShortTokenAmount"),
    marketTokenAmount:
        "marketTokenAmount" in table
            ? sql<string>`${table.marketTokenAmount}`.as("marketTokenAmount")
            : sql<null>`null`.as("marketTokenAmount"),
    minMarketTokenAmount:
        "minMarketTokenAmount" in table
            ? sql<string>`${table.minMarketTokenAmount}`.as("minMarketTokenAmount")
            : sql<null>`null`.as("minMarketTokenAmount"),
    receivedMarketTokenAmount:
        "receivedMarketTokenAmount" in table
            ? sql<string>`${table.receivedMarketTokenAmount}`.as("receivedMarketTokenAmount")
            : sql<null>`null`.as("receivedMarketTokenAmount"),
    txHash: table.txHash,
    createdAt: table.createdAt,
});

const buildQueryPlaceholder = ({
    actions,
    markets,
    from,
    to,
}: DepositWithdrawalHistoryQueryWithoutPagination) => ({
    ...(isNotEmptyArray(actions) && { actions }),
    ...(isNotEmptyArray(markets) && { markets }),
    ...(from && { from }),
    ...(to && { to }),
});

const buildFilters =
    ({ actions, markets, from, to }: DepositWithdrawalHistoryQueryWithoutPagination) =>
    (table: DepositWithdrawalHistoryTable) =>
        [
            buildAccountFilter(table),
            isNotEmptyArray(markets) ? buildMarketFilter(table) : null,
            isNotEmptyArray(actions) ? buildActionFilter(table) : null,
            from ? buildFromDateFilter(table) : null,
            to ? buildToDateFilter(table) : null,
        ].filter((f) => !!f);

const buildAccountFilter = (table: DepositWithdrawalHistoryTable) =>
    eq(lower(table.account), sql.placeholder("account"));

const buildMarketFilter = (table: DepositWithdrawalHistoryTable) =>
    eq(lower(table.market), sql`any(${sql.placeholder("markets")}::varchar[])`);

const buildActionFilter = (table: DepositWithdrawalHistoryTable) =>
    eq(table.action, sql`any(${sql.placeholder("actions")}::integer[])`);

const buildFromDateFilter = (table: DepositWithdrawalHistoryTable) =>
    gte(table.createdAt, sql.placeholder("from"));

const buildToDateFilter = (table: DepositWithdrawalHistoryTable) =>
    lte(table.createdAt, sql.placeholder("to"));
