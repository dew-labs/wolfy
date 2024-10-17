import { Elysia, t } from "elysia";
import { tradeHistoryQuery, tradeHistoryResponse } from "../models/trade-history.model";
import { ormPlugin } from "../orm";
import { getTradeHistory } from "../services/trade-history.service";

export const accountRoute = new Elysia({ prefix: "/accounts" })
    .use(ormPlugin)
    .get(
        "/:address/trade-history",
        ({ orm, query, params: { address } }) => getTradeHistory(orm, address, query),
        {
            params: t.Object({
                address: t.String(),
            }),
            query: tradeHistoryQuery,
            response: tradeHistoryResponse,
            detail: {
                summary: "GetAccountTradeHistory",
                operationId: "GetAccountTradeHistory",
                description: "Get account trade history",
                tags: ["Account"],
            },
        }
    );
