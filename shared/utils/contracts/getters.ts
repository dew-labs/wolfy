import {
    createSatoruContract,
    DataStoreABI,
    DepositHandlerABI,
    ExchangeRouterABI,
    LiquidationHandlerABI,
    ReaderABI,
    SatoruContract,
    type SatoruContractAbi,
    type StarknetChainId,
} from "satoru-sdk";
import type { Account, TypedContractV2 } from "starknet";

const createContractGetter =
    <T extends SatoruContract>(contractType: T, abi: SatoruContractAbi<T>) =>
    (chainId: StarknetChainId, connectTo?: Account): TypedContractV2<SatoruContractAbi<T>> =>
        createSatoruContract(chainId, contractType, abi, connectTo);

export const getDataStoreContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>> = createContractGetter(
    SatoruContract.DataStore,
    DataStoreABI
);

export const getExchangeRouterContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<SatoruContractAbi<SatoruContract.ExchangeRouter>> = createContractGetter(
    SatoruContract.ExchangeRouter,
    ExchangeRouterABI
);

export const getReaderContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<SatoruContractAbi<SatoruContract.Reader>> = createContractGetter(
    SatoruContract.Reader,
    ReaderABI
);

export const getLiquidationHandlerContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<SatoruContractAbi<SatoruContract.LiquidationHandler>> = createContractGetter(
    SatoruContract.LiquidationHandler,
    LiquidationHandlerABI
);

export const getDepositHandlerContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<SatoruContractAbi<SatoruContract.DepositHandler>> = createContractGetter(
    SatoruContract.DepositHandler,
    DepositHandlerABI
);
