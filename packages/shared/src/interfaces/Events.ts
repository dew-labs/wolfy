import type { WolfyEvent, WolfyEventHandler } from "wolfy-sdk";

export enum EventHandlerTypes {
    OrderCreated = "OrderCreated",
    PositionIncrease = "PositionIncrease",
    PositionDecrease = "PositionDecrease",
    OraclePriceUpdated = "OraclePriceUpdated",
    PriceChanged = "PriceChanged",
}

export interface Events {
    [EventHandlerTypes.OraclePriceUpdated]: (tokenAddress: string, price: bigint) => void;
    [EventHandlerTypes.OrderCreated]: (handler: WolfyEventHandler<WolfyEvent.OrderCreated>) => void;
    [EventHandlerTypes.PositionIncrease]: (
        handler: WolfyEventHandler<WolfyEvent.PositionIncrease>
    ) => void;
    [EventHandlerTypes.PositionDecrease]: (
        handler: WolfyEventHandler<WolfyEvent.PositionDecrease>
    ) => void;
    [EventHandlerTypes.PriceChanged]: (tokenAddress: string, price: bigint) => void;
}
