import {
    createWolfyContract,
    DataStoreABI,
    DepositHandlerABI,
    ExchangeRouterABI,
    LiquidationHandlerABI,
    ReaderABI,
    WolfyContract,
    WithdrawalHandlerABI,
    type WolfyContractAbi,
    type StarknetChainId,
} from "wolfy-sdk";
import type { Account, TypedContractV2 } from "starknet";

const createContractGetter =
    <T extends WolfyContract>(contractType: T, abi: WolfyContractAbi<T>) =>
    (chainId: StarknetChainId, connectTo?: Account): TypedContractV2<WolfyContractAbi<T>> =>
        createWolfyContract(chainId, contractType, abi, connectTo);

export const getDataStoreContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<WolfyContractAbi<WolfyContract.DataStore>> = createContractGetter(
    WolfyContract.DataStore,
    DataStoreABI
);

export const getExchangeRouterContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<WolfyContractAbi<WolfyContract.ExchangeRouter>> = createContractGetter(
    WolfyContract.ExchangeRouter,
    ExchangeRouterABI
);

export const getReaderContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<WolfyContractAbi<WolfyContract.Reader>> = createContractGetter(
    WolfyContract.Reader,
    ReaderABI
);

export const getLiquidationHandlerContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<WolfyContractAbi<WolfyContract.LiquidationHandler>> = createContractGetter(
    WolfyContract.LiquidationHandler,
    LiquidationHandlerABI
);

export const getDepositHandlerContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<WolfyContractAbi<WolfyContract.DepositHandler>> = createContractGetter(
    WolfyContract.DepositHandler,
    DepositHandlerABI
);

export const getWithdrawalHandlerContract: (
    chainId: StarknetChainId,
    connectTo?: Account
) => TypedContractV2<WolfyContractAbi<WolfyContract.WithdrawalHandler>> = createContractGetter(
    WolfyContract.WithdrawalHandler,
    WithdrawalHandlerABI
);
