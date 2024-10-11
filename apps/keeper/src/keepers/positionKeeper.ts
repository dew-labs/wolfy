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

import {
    createLogger,
    getNetworkConfig,
    getPosition,
    type ContractPosition,
} from "@freyr/shared/utils";

import { getDataStoreContract } from "@freyr/shared/contracts";
import type { TypedContractV2 } from "starknet";
import { removePosition, savePosition } from "../services/positionPersistenceService";

const logger = createLogger("PositionKeeper");

const increasePosition = (event: Parameters<SatoruEventHandler<SatoruEvent.PositionIncrease>>[0]) =>
    savePosition(toStarknetHexString(event.position_key));

const decreasePosition = async (
    event: Parameters<SatoruEventHandler<SatoruEvent.PositionDecrease>>[0],
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>
) => {
    const positionKey = toStarknetHexString(event.position_key as bigint);
    const position: ContractPosition = await getPosition(dataStoreContract, positionKey);
    if (cairoIntToBigInt(position.size_in_usd) > 0n) {
        return;
    }

    removePosition(positionKey);
};

const onPositionIncreasedHandler: SatoruEventHandler<SatoruEvent.PositionIncrease> = (event) =>
    increasePosition(event);

const onPositionDecreasedHandler: (
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>
) => SatoruEventHandler<SatoruEvent.PositionDecrease> = (dataStoreContract) => async (event) =>
    decreasePosition(event, dataStoreContract);

export function createPositionKeeper() {
    const { chainId, account } = getNetworkConfig();
    const dataStoreContract = getDataStoreContract(chainId, account);

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
