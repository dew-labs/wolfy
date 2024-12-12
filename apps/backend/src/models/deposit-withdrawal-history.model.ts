import { t } from "elysia";
import { TradeHistoryAction } from "packages/shared/src/interfaces";
import Paginate from "./pagination.model";

const depositWithdrawalHistoryQuery = t.Object({
    actions: t.Array(t.Numeric(), { default: [] }),
    markets: t.Array(t.String(), { default: [] }),
    page: t.Number({ minimum: 1, default: 1 }),
    limit: t.Number({ minimum: 1, default: 10 }),
    from: t.Optional(t.Number({ description: "timestamp in seconds" })),
    to: t.Optional(t.Number({ description: "timestamp in seconds" })),
});

type DepositWithdrawalHistoryQuery = typeof depositWithdrawalHistoryQuery.static;

const depositWithdrawalHistoryEntry = t.Object({
    id: t.String(),
    market: t.String(),
    action: t.Enum(TradeHistoryAction),
    executionFee: t.String(),
    longTokenAmount: t.String(),
    shortTokenAmount: t.String(),
    marketTokenAmount: t.Nullable(t.String()),
    minMarketTokenAmount: t.Nullable(t.String()),
    createdAt: t.Integer(),
});

const depositWithdrawalHistoryResponse = Paginate(depositWithdrawalHistoryEntry);

type DepositWithdrawalHistoryResponse = typeof depositWithdrawalHistoryResponse.static;

export { depositWithdrawalHistoryQuery, depositWithdrawalHistoryResponse };
export type { DepositWithdrawalHistoryQuery, DepositWithdrawalHistoryResponse };
