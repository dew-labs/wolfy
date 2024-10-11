import { SatoruContract, type SatoruContractAbi, toStarknetHexString } from "satoru-sdk";
import { type TypedContractV2 } from "starknet";

export type ContractPosition = Awaited<ReturnType<typeof getPosition>>;

export const getPosition = async (
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>,
    positionKey: string
) => await dataStoreContract.get_position(toStarknetHexString(positionKey));
