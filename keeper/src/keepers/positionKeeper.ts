import {
    cairoIntToBigInt,
    getProvider,
    ProviderType,
    SatoruEvent,
    toStarknetHexString,
    type SatoruEventHandler,
} from "satoru-sdk";

import { createLogger } from "@/shared/utils/logger";
import { getNetworkConfig } from "@/shared/utils/utils";

import {
    getPosition,
    removePosition,
    savePosition,
    updatePosition,
} from "../services/positionPersistenceService";

const logger = createLogger("PositionKeeper");

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

const onPositionIncreasedHandler: SatoruEventHandler<SatoruEvent.PositionIncrease> = (event) => {
    changePosition(event, true);
};

const onPositionDecreasedHandler: SatoruEventHandler<SatoruEvent.PositionDecrease> = (event) => {
    changePosition(event, false);
};

export function createPositionKeeper() {
    const { chainId } = getNetworkConfig();

    const run = async () => {
        try {
            const wssProvider = getProvider(ProviderType.WSS, chainId);
            wssProvider.onClose(run);

            await wssProvider.subscribeTo(SatoruEvent.PositionIncrease, onPositionIncreasedHandler);
            await wssProvider.subscribeTo(SatoruEvent.PositionDecrease, onPositionDecreasedHandler);
        } catch (error) {
            logger.error(error, "Failed to start");
            throw error;
        }
    };

    return { run };
}
