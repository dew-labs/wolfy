import { WolfyContract, type WolfyContractAbi, toStarknetHexString } from "wolfy-sdk";
import { type TypedContractV2 } from "starknet";

export type ContractPosition = Awaited<ReturnType<typeof getPosition>>;

export const getPosition = async (
    dataStoreContract: TypedContractV2<WolfyContractAbi<WolfyContract.DataStore>>,
    positionKey: string
) => await dataStoreContract.get_position(toStarknetHexString(positionKey));
