import { SatoruEvent, toStarknetHexString, cairoIntToBigInt } from "satoru-sdk";
import type { SatoruEventHandler } from "satoru-sdk";
import type { Emitter } from "nanoevents";

import type { Position } from "@/shared/interfaces/Position";
import {
    savePosition,
    getPosition,
    removePosition,
    updatePosition,
} from "../services/positionPersistenceService";

export const createPositionEventHandler = () => {
    const handlePositionChange = (
        event: Parameters<
            SatoruEventHandler<SatoruEvent.PositionIncrease | SatoruEvent.PositionDecrease>
        >[0],
        isIncrease: boolean
    ) => {
        const { position_key, size_delta_usd } = event;
        const positionKey = toStarknetHexString(position_key as bigint);
        const sizeDeltaUsd = cairoIntToBigInt(size_delta_usd as bigint);

        const existingPosition = getPosition(positionKey);

        if (existingPosition) {
            const newSizeDeltaUsd = isIncrease
                ? existingPosition.sizeDeltaUsd + sizeDeltaUsd
                : existingPosition.sizeDeltaUsd - sizeDeltaUsd;

            if (newSizeDeltaUsd > 0) {
                updatePosition({ ...existingPosition, sizeDeltaUsd: newSizeDeltaUsd });
            } else {
                removePosition(positionKey);
            }
        } else if (isIncrease) {
            savePosition({ key: positionKey, sizeDeltaUsd });
        }
    };

    const handlePositionIncrease: SatoruEventHandler<SatoruEvent.PositionIncrease> = (event) => {
        handlePositionChange(event, true);
    };

    const handlePositionDecrease: SatoruEventHandler<SatoruEvent.PositionDecrease> = (event) => {
        handlePositionChange(event, false);
    };

    return {
        handlePositionIncrease,
        handlePositionDecrease,
    };
};
