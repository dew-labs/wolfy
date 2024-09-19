import type { SatoruEvent, SatoruEventHandler } from "satoru-sdk";

export enum EventHandlerTypes {
    OrderCreated = "OrderCreated",
    PositionIncrease = "PositionIncrease",
    PositionDecrease = "PositionDecrease",
    OraclePriceUpdated = "OraclePriceUpdated",
    PriceChanged = "PriceChanged",
}

export interface Events {
    [EventHandlerTypes.OraclePriceUpdated]: (tokenAddress: string, price: bigint) => void;
    [EventHandlerTypes.OrderCreated]: (
        handler: SatoruEventHandler<SatoruEvent.OrderCreated>
    ) => void;
    [EventHandlerTypes.PositionIncrease]: (
        handler: SatoruEventHandler<SatoruEvent.PositionIncrease>
    ) => void;
    [EventHandlerTypes.PositionDecrease]: (
        handler: SatoruEventHandler<SatoruEvent.PositionDecrease>
    ) => void;
    [EventHandlerTypes.PriceChanged]: (tokenAddress: string, price: bigint) => void;
}
