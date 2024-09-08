import { Type, type Static } from "@sinclair/typebox";
import { OrderType } from "satoru-sdk";

export interface Order {
    key: string;
    market: string;
    order_type: OrderType;
    is_long: boolean;
    trigger_price?: bigint;
    acceptable_price: bigint;
}

export const OrderSchema = Type.Object({
    key: Type.String(),
    market: Type.String(),
    order_type: Type.Enum(OrderType),
    is_long: Type.Boolean(),
    trigger_price: Type.BigInt(),
    acceptable_price: Type.BigInt(),
});

export const OrdersSchema = Type.Optional(Type.Record(Type.String(), Type.Array(OrderSchema)));
