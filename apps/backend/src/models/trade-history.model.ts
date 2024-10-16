import { t } from "elysia";

const tradeHistoryQuery = t.Object({
    marketOrders: t.Optional(t.String()),
    limitOrders: t.Optional(t.String()),
    takeProfitOrders: t.Optional(t.String()),
    stopLossOrders: t.Optional(t.String()),
    liquidation: t.Optional(t.String()),
    deposit: t.Optional(t.String()),
    withdraw: t.Optional(t.String()),
});

type TradeHistoryQuery = typeof tradeHistoryQuery.static;

export { tradeHistoryQuery };
export type { TradeHistoryQuery };
