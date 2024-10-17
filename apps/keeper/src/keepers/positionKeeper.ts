import {
    cairoIntToBigInt,
    getProvider,
    ProviderType,
    SatoruContract,
    SatoruEvent,
    toStarknetHexString,
    type SatoruContractAbi,
    type SatoruEventHandler,
} from "satoru-sdk";
import type { TypedContractV2 } from "starknet";

import {
    createLogger,
    getNetworkConfig,
    getOpenPositionKeys,
    getPosition,
    setOpenPositionKeys,
    type ContractPosition,
} from "@freyr/shared/utils";
import { getDataStoreContract } from "@freyr/shared/contracts";

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
    console.log("🚀 ~ removeOpenPositionKey ~ index:", index);
    if (index > -1) {
        openPositionKeys.splice(index, 1);
    }
    setOpenPositionKeys(openPositionKeys);
};

const initializeOpenPositionKeys = async (): Promise<void> => {
    const openPositionKeys = await fetchOpenPositionKeys();

    setOpenPositionKeys(openPositionKeys);
};

const onPositionIncreasedHandler: SatoruEventHandler<SatoruEvent.PositionIncrease> = (event) => {
    const positionKey = toStarknetHexString(event.position_key as bigint);
    addOpenPositionKey(positionKey);
};

const onPositionDecreasedHandler: (
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>
) => SatoruEventHandler<SatoruEvent.PositionDecrease> = (dataStoreContract) => async (event) => {
    const positionKey = toStarknetHexString(event.position_key as bigint);
    const position: ContractPosition = await getPosition(dataStoreContract, positionKey);
    if (cairoIntToBigInt(position.size_in_usd) > 0n) {
        return;
    }
    removeOpenPositionKey(positionKey);
};

export function createPositionKeeper() {
    const { chainId, account } = getNetworkConfig();
    const dataStoreContract = getDataStoreContract(chainId, account);

    initializeOpenPositionKeys();

    const run = async () => {
        try {
            const wssProvider = getProvider(ProviderType.WSS, chainId);
            wssProvider.onClose(run);

            await wssProvider.subscribeTo(SatoruEvent.PositionIncrease, onPositionIncreasedHandler);
            await wssProvider.subscribeTo(
                SatoruEvent.PositionDecrease,
                onPositionDecreasedHandler(dataStoreContract)
            );
        } catch (error) {
            logger.error(error, "Failed to start");
            throw error;
        }
    };

    return { run };
}
