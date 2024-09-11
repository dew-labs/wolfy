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

export const createPositionEventHandler = (emitter: Emitter) => {
    const handlePositionIncrease: SatoruEventHandler<SatoruEvent.PositionIncrease> = (event) => {
        const { position_key, size_delta_usd } = event;
        const positionKey: string = toStarknetHexString(position_key);
        const sizeDeltaUsd: bigint = cairoIntToBigInt(size_delta_usd);

        const existingPosition = getPosition(positionKey);

        if (existingPosition) {
            const updatedPosition: Position = {
                ...existingPosition,
                sizeDeltaUsd: existingPosition.sizeDeltaUsd + sizeDeltaUsd,
            };
            updatePosition(updatedPosition);
        } else {
            const newPosition: Position = {
                key: positionKey,
                sizeDeltaUsd: sizeDeltaUsd,
            };
            savePosition(newPosition);
        }

        emitter.emit("positionUpdated", positionKey);
    };

    const handlePositionDecrease: SatoruEventHandler<SatoruEvent.PositionDecrease> = (event) => {
        const { position_key, size_delta_usd } = event;
        const positionKey: string = toStarknetHexString(position_key);
        const sizeDeltaUsd: bigint = cairoIntToBigInt(size_delta_usd);

        const existingPosition = getPosition(positionKey);

        if (existingPosition) {
            if (existingPosition.sizeDeltaUsd > sizeDeltaUsd) {
                const updatedPosition: Position = {
                    ...existingPosition,
                    sizeDeltaUsd: existingPosition.sizeDeltaUsd - sizeDeltaUsd,
                };
                updatePosition(updatedPosition);
            } else {
                removePosition(positionKey);
            }
        }

        emitter.emit("positionUpdated", positionKey);
    };

    return {
        handlePositionIncrease,
        handlePositionDecrease,
    };
};
