import { createLogger } from "@freyr/shared/utils";
import type { Order } from "@freyr/shared/interfaces";

import { client } from "../client";
import {
    TRIGGER_ORDERS_QUERY,
    TRIGGER_ORDERS_QUERY_VARIABLES,
    type TriggerOrdersQueryResponse,
} from "../queries/orderQueries";
import { cairoIntToBigInt } from "wolfy-sdk";

const logger = createLogger("OrderService");

export const fetchCreatedTriggerOrders = async () => {
    try {
        // TODO: use typebox to validate the response
        const response = await client.request<TriggerOrdersQueryResponse>(
            TRIGGER_ORDERS_QUERY,
            TRIGGER_ORDERS_QUERY_VARIABLES
        );

        const orders: Order[] = response.orders.map((order) => {
            return {
                key: order.key,
                market: order.market,
                orderType: order.order_type,
                isLong: order.is_long,
                indexTokenAddress: order.index_token_address,
                sizeDeltaUsd: cairoIntToBigInt(order.size_delta_usd),
                triggerPrice: cairoIntToBigInt(order.trigger_price),
                acceptablePrice: cairoIntToBigInt(order.acceptable_price),
            };
        });

        return orders;
    } catch (error) {
        logger.error(error, "Error fetching created trigger orders:");
        return [];
    }
};
