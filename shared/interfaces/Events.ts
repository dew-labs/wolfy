import type { SatoruEvent, SatoruEventHandler } from "satoru-sdk";
import { EventHandlerTypes } from "@/shared/utils/config";

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
    [EventHandlerTypes.executeLimitOrdersIfExecutable]: (
        handler: SatoruEventHandler<SatoruEvent.OrderCreated>
    ) => void;
}
