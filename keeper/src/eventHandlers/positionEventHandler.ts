import { SatoruEvent, toStarknetHexString, cairoIntToBigInt } from "satoru-sdk";
import type { SatoruEventHandler } from "satoru-sdk";

import {
    savePosition,
    getPosition,
    removePosition,
    updatePosition,
} from "../services/positionPersistenceService";

const changePosition = (
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

export const onPositionIncreasedHandler: SatoruEventHandler<SatoruEvent.PositionIncrease> = (
    event
) => {
    changePosition(event, true);
};

export const onPositionDecreasedHandler: SatoruEventHandler<SatoruEvent.PositionDecrease> = (
    event
) => {
    changePosition(event, false);
};
