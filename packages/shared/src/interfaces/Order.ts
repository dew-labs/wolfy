import { Type, type Static } from "@sinclair/typebox";
import { OrderType } from "satoru-sdk";

export interface Order {
    key: string;
    market: string;
    orderType: OrderType;
    isLong: boolean;
    indexTokenAddress: string;
    sizeDeltaUsd: bigint;
    triggerPrice?: bigint;
    acceptablePrice: bigint;
}

export const OrderSchema = Type.Object({
    key: Type.String(),
    market: Type.String(),
    orderType: Type.Enum(OrderType),
    isLong: Type.Boolean(),
    indexTokenAddress: Type.String(),
    sizeDeltaUsd: Type.BigInt(),
    triggerPrice: Type.Optional(Type.BigInt()),
    acceptablePrice: Type.BigInt(),
});

export const OrdersSchema = Type.Optional(Type.Record(Type.String(), Type.Array(OrderSchema)));
