import { t } from "elysia";
import { TradeHistoryAction } from "packages/shared/src/interfaces";
import Paginate from "./pagination.model";

const tradeHistoryQuery = t.Object({
    actions: t.Array(t.Numeric(), { default: [] }),
    markets: t.Array(t.String(), { default: [] }),
    page: t.Number({ minimum: 1, default: 1 }),
    limit: t.Number({ minimum: 1, default: 10 }),
    from: t.Optional(t.Number({ description: "timestamp in seconds" })),
    to: t.Optional(t.Number({ description: "timestamp in seconds" })),
    isLong: t.Optional(t.BooleanString()),
});

type TradeHistoryQuery = typeof tradeHistoryQuery.static;

const tradeHistoryEntry = t.Object({
    id: t.String(),
    market: t.String(),
    action: t.Enum(TradeHistoryAction),
    isLong: t.Boolean(),
    price: t.String(),
    acceptablePrice: t.Nullable(t.String()),
    collateralToken: t.String(),
    collateralAmount: t.Nullable(t.String()),
    collateralDeltaAmount: t.String(),
    size: t.String(),
    rpnl: t.Nullable(t.String()),
    fee: t.Nullable(t.String()),
    createdAt: t.Integer(),
});

const tradeHistoryResponse = Paginate(tradeHistoryEntry);

type TradeHistoryResponse = typeof tradeHistoryResponse.static;

export { tradeHistoryQuery, tradeHistoryResponse };
export type { TradeHistoryQuery, TradeHistoryResponse };
