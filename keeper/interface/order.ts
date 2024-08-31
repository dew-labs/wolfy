import type { OrderType } from "satoru-sdk";

export interface IOrder {
    order_type: OrderType;
    trigger_price: bigint;
    acceptable_price: bigint;
    is_long: boolean;
}

export interface IOrdersMap {
    [key: string]: IOrder;
}
