import type { SatoruEvent, SatoruEventHandler } from "satoru-sdk";

export enum EventHandlerTypes {
    orderCreated = "orderCreated",
    positionIncrease = "positionIncrease",
    positionDecrease = "positionDecrease",
    oraclePriceUpdated = "oraclePriceUpdated",
    priceChanged = "priceChanged",
}

export interface Events {
    [EventHandlerTypes.oraclePriceUpdated]: (tokenAddress: string, price: bigint) => void;
    [EventHandlerTypes.orderCreated]: (
        handler: SatoruEventHandler<SatoruEvent.OrderCreated>
    ) => void;
    [EventHandlerTypes.positionIncrease]: (
        handler: SatoruEventHandler<SatoruEvent.PositionIncrease>
    ) => void;
    [EventHandlerTypes.positionDecrease]: (
        handler: SatoruEventHandler<SatoruEvent.PositionDecrease>
    ) => void;
    [EventHandlerTypes.priceChanged]: (tokenAddress: string, price: bigint) => void;
}
