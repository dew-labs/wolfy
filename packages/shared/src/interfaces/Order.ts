import { Type, type Static } from "@sinclair/typebox";
import { OrderType } from "satoru-sdk";

export interface Order {
    key: string;
    market: string;
    orderType: OrderType;
    isLong: boolean;
    sizeDeltaUsd: bigint;
    triggerPrice?: bigint;
    acceptablePrice: bigint;
}
