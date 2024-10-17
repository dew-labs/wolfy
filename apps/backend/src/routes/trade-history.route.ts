import { Elysia } from "elysia";
import { tradeHistoryQuery, tradeHistoryResponse } from "../models/trade-history.model";
import { ormPlugin } from "../orm";
import { getTradeHistory } from "../services/trade-history.service";

export const tradeRoute = new Elysia({ prefix: "/trade-history" })
    .use(ormPlugin)
    .get("/", ({ orm, query }) => getTradeHistory(orm, query), {
        query: tradeHistoryQuery,
        response: tradeHistoryResponse,
        detail: {
            tags: ["Trade History"],
        }
    });
