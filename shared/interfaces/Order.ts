import type { OrderType } from "satoru-sdk";

export interface Order {
    key: string;
    market: string;
    order_type: OrderType;
    is_long: boolean;
    trigger_price?: bigint;
    acceptable_price: bigint;
}
