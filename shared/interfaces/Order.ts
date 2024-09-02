import type { OrderType } from "satoru-sdk";

export interface Order {
    key: string;
    market: string;
    order_type: OrderType;
    acceptable_price: bigint;
    is_long: boolean;
}

export interface MarketOrder extends Order {
    order_type: OrderType.MarketIncrease;
}

export interface LimitOrder extends Order {
    order_type: OrderType.LimitIncrease;
    trigger_price: number;
}

export interface OrdersMap {
    [key: string]: Order;
}
