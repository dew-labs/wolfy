import { Elysia, t } from "elysia";
import { ormPlugin } from "@backend/src/orm";
import { tradeHistoryQuery, tradeHistoryResponse } from "@backend/src/models/trade-history.model";
import {
    depositWithdrawalHistoryQuery,
    depositWithdrawalHistoryResponse,
} from "@backend/src/models/deposit-withdrawal-history.model";

import { getTradeHistory } from "../services/trade-history.service";
import { getDepositWithdrawalHistory } from "../services/deposit-withdrawal-history.service";

export const accountRoute = new Elysia({ prefix: "/accounts" })
    .use(ormPlugin)
    .get(
        "/:address/trade-history",
        ({ orm, query, params: { address } }) => getTradeHistory(orm, address, query),
        {
            params: t.Object({ address: t.String() }),
            query: tradeHistoryQuery,
            response: tradeHistoryResponse,
            detail: {
                summary: "GetAccountTradeHistory",
                operationId: "GetAccountTradeHistory",
                description: "Get account trade history",
                tags: ["Account"],
            },
        }
    )
    .get(
        "/:address/deposit-withdrawal-history",
        ({ orm, query, params: { address } }) => getDepositWithdrawalHistory(orm, address, query),
        {
            params: t.Object({ address: t.String() }),
            query: depositWithdrawalHistoryQuery,
            response: depositWithdrawalHistoryResponse,
            detail: {
                summary: "GetAccountDepositWithdrawalHistory",
                operationId: "GetAccountDepositWithdrawalHistory",
                description: "Get account deposit withdrawal history",
                tags: ["Account"],
            },
        }
    );
