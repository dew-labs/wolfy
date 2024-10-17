import { createLogger } from "@freyr/shared/utils";
import type { Order } from "@freyr/shared/interfaces";

import { client } from "../client";
import {
    CREATED_TRIGGER_ORDERS_QUERY,
    CREATED_TRIGGER_ORDERS_QUERY_VARIABLES,
    type CreatedTriggerOrdersQueryResponse,
} from "../queries/orderQueries";

const logger = createLogger("OrderService");

export const fetchCreatedTriggerOrders = async () => {
    try {
        // TODO: use typebox to validate the response
        const response = await client.request<CreatedTriggerOrdersQueryResponse>(
            CREATED_TRIGGER_ORDERS_QUERY,
            CREATED_TRIGGER_ORDERS_QUERY_VARIABLES
        );

        const orders: Order[] = response.orders.map((order) => {
            return {
                key: order.key,
                market: order.market,
                orderType: order.order_type,
                isLong: order.is_long,
                indexTokenAddress: order.index_token_address,
                sizeDeltaUsd: order.size_delta_usd,
                triggerPrice: order.trigger_price,
                acceptablePrice: order.acceptable_price,
            };
        });

        return orders;
    } catch (error) {
        logger.error("Error fetching created trigger orders:", error);
        return [];
    }
};
