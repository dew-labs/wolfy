import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { deposits, withdrawals } from "@backend/drizzle/schema";
import { lower } from "@backend/drizzle/utils";
import { isNotEmptyArray } from "@backend/src/utils/utils";

import type {
    DepositWithdrawalHistoryQuery,
    DepositWithdrawalHistoryResponse,
} from "@backend/src/models/deposit-withdrawal-history.model";
import type { Orm } from "@backend/src/orm";

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

    const [countData, deposit] = await Promise.all([
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

    return {
        data: deposit,
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
            : sql<string>`${table.minLongTokenAmount}`.as("longTokenAmount"),
    shortTokenAmount:
        "shortTokenAmount" in table
            ? sql<string>`${table.shortTokenAmount}`.as("shortTokenAmount")
            : sql<string>`${table.minShortTokenAmount}`.as("shortTokenAmount"),
    marketTokenAmount:
        "receivedMarketTokens" in table
            ? sql<string>`${table.receivedMarketTokens}`.as("marketTokenAmount")
            : sql<string>`${table.marketTokenAmount}`.as("marketTokenAmount"),
    minMarketTokenAmount:
        "minMarketTokens" in table
            ? sql<string>`${table.minMarketTokens}`.as("minMarketTokenAmount")
            : sql<null>`null`.as("minMarketTokenAmount"),
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
