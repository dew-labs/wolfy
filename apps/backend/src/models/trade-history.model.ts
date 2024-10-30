import { t } from "elysia";
import Paginate from "./pagination.model";
import { TradeHistoryAction } from "packages/shared/src/interfaces";

const tradeHistoryQuery = t.Object({
    actions: t.Optional(
        t.String({ description: "comma separated list of actions", examples: "1,2,3" })
    ),
    markets: t.Optional(
        t.String({ description: "comma separated list of markets", examples: "0x12345,0x67890" })
    ),
    page: t.Number({ minimum: 1, default: 1 }),
    limit: t.Number({ minimum: 1, default: 10 }),
    from: t.Optional(t.Number({ description: "timestamp in seconds" })),
    to: t.Optional(t.Number({ description: "timestamp in seconds" })),
    isLong: t.Optional(t.BooleanString()),
});

type TradeHistoryQuery = typeof tradeHistoryQuery.static;


const tradeHistoryEntry = t.Object({
    id: t.String(),
    price: t.String(),
    size: t.String(),
    isLong: t.Boolean(),
    action: t.Enum(TradeHistoryAction),
    market: t.String(),
});

const tradeHistoryResponse = Paginate(tradeHistoryEntry);

type TradeHistoryResponse = typeof tradeHistoryResponse.static;

export { tradeHistoryQuery, tradeHistoryResponse };
export type { TradeHistoryQuery, TradeHistoryResponse };

