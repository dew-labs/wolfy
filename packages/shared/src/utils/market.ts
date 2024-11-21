import { WolfyContract, type WolfyContractAbi, toStarknetHexString } from "wolfy-sdk";
import { type TypedContractV2 } from "starknet";

export type ContractMarket = Awaited<ReturnType<typeof getMarket>>;

export const getMarket = async (
    dataStoreContract: TypedContractV2<WolfyContractAbi<WolfyContract.DataStore>>,
    marketAddress: string
) => await dataStoreContract.get_market(toStarknetHexString(marketAddress));
