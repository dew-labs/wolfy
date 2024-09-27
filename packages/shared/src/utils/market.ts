import { SatoruContract, type SatoruContractAbi, toStarknetHexString } from "satoru-sdk";
import { type TypedContractV2 } from "starknet";

export type ContractMarket = Awaited<ReturnType<typeof getMarket>>;

export const getMarket = async (
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>,
    marketAddress: string
) => await dataStoreContract.get_market(toStarknetHexString(marketAddress));
