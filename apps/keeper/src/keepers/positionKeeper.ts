import {
    cairoIntToBigInt,
    getProvider,
    ProviderType,
    WolfyEvent,
    toStarknetHexString,
    type WolfyEventHandler,
} from "wolfy-sdk";
import type { TypedContractV2 } from "starknet";

import {
    createLogger,
    getNetworkConfig,
    getOpenPositionKeys,
    setOpenPositionKeys,
} from "@freyr/shared/utils";

import { fetchOpenPositionKeys } from "../graphql/services/positionService";

const logger = createLogger("PositionKeeper");

const addOpenPositionKey = (key: string): void => {
    const openPositionKeys = getOpenPositionKeys();
    if (!openPositionKeys.includes(key)) {
        openPositionKeys.push(key);
    }
    setOpenPositionKeys(openPositionKeys);
};

const removeOpenPositionKey = (key: string): void => {
    const openPositionKeys = getOpenPositionKeys();
    const index = openPositionKeys.indexOf(key);
    if (index > -1) {
        openPositionKeys.splice(index, 1);
    }
    setOpenPositionKeys(openPositionKeys);
};

const onPositionIncreasedHandler: WolfyEventHandler<WolfyEvent.PositionIncrease> = (event) => {
    const positionKey = toStarknetHexString(event.position_key);
    addOpenPositionKey(positionKey);
};

const onPositionDecreasedHandler: WolfyEventHandler<WolfyEvent.PositionDecrease> = (event) => {
    if (cairoIntToBigInt(event.size_in_usd) > 0n) {
        return;
    }
    removeOpenPositionKey(toStarknetHexString(event.position_key));
};

export function createPositionKeeper() {
    const { chainId } = getNetworkConfig();

    const run = async () => {
        try {
            const wssProvider = getProvider(ProviderType.WSS, chainId);
            wssProvider.onClose(run);

            await wssProvider.subscribeTo(WolfyEvent.PositionIncrease, onPositionIncreasedHandler);
            await wssProvider.subscribeTo(WolfyEvent.PositionDecrease, onPositionDecreasedHandler);
        } catch (error) {
            logger.error(error, "Failed to start");
            throw error;
        }
    };

    return { run };
}
