import { gql } from "graphql-request";
import { OrderType } from "satoru-sdk";

export type TriggerOrdersQueryResponse = {
    orders: {
        key: string;
        market: string;
        order_type: OrderType;
        is_long: boolean;
        index_token_address: string;
        size_delta_usd: bigint;
        trigger_price: bigint;
        acceptable_price: bigint;
    }[];
};

export const TRIGGER_ORDERS_QUERY = gql`
    query TriggerOrders($where: Order_filter) {
        orders(where: $where) {
            key
            market
            order_type
            is_long
            size_delta_usd
            trigger_price
            acceptable_price
        }
    }
`;

export const TRIGGER_ORDERS_QUERY_VARIABLES = {
    where: {
        order_type_in: [
            OrderType.LimitIncrease,
            OrderType.LimitDecrease,
            OrderType.StopLossDecrease,
        ],
    },
};
