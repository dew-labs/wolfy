import type { Account } from "starknet";

import {
    createCall,
    getProvider,
    ProviderType,
    SatoruEvent,
    StarknetChainId,
    toStarknetHexString,
    type SatoruEventHandler,
} from "satoru-sdk";

import { getDepositHandlerContract } from "@freyr/shared/contracts";
import {
    createLogger,
    executeAndGetResult,
    getNetworkConfig,
    getSetPriceParams,
    measureExecutionTime,
} from "@freyr/shared/utils";

import { getOraclePrice } from "../services/pythPriceOracleService";

const logger = createLogger("DepositKeeper");

const executeDeposit = async (
    account: Account,
    chainId: StarknetChainId,
    depositKey: string,
    longTokenAddress: string,
    shortTokenAddress: string,
    executionLongPrice: bigint,
    executionShortPrice: bigint
): Promise<void> => {
    return await measureExecutionTime(async () => {
        const priceParams = await getSetPriceParams(account, [
            [longTokenAddress, executionLongPrice],
            [shortTokenAddress, executionShortPrice],
        ]);

        const depositHandlerContract = getDepositHandlerContract(chainId, account);

        logger.debug(`Deposit ${depositKey}: Executing ...`);

        await executeAndGetResult(
            account,
            createCall(depositHandlerContract, "execute_deposit", [depositKey, priceParams]),
            (receipt) => {
                logger.debug(`Deposit ${depositKey}: Transaction key ${receipt.transaction_hash}`);
            },
            `Deposit ${depositKey}: Failed to execute`
        );
    }, `Deposit ${depositKey}: Executed`);
};

const onDepositCreatedHandler =
    (account: Account, chainId: StarknetChainId): SatoruEventHandler<SatoruEvent.DepositCreated> =>
    async (event) => {
        const { key, initial_long_token, initial_short_token } = event;

        const depositKey = toStarknetHexString(key);
        const longTokenAddress = toStarknetHexString(initial_long_token);
        const shortTokenAddress = toStarknetHexString(initial_short_token);

        const executionLongPrice = getOraclePrice(longTokenAddress);
        const executionShortPrice = getOraclePrice(shortTokenAddress);

        // TODO: retry
        await executeDeposit(
            account,
            chainId,
            depositKey,
            longTokenAddress,
            shortTokenAddress,
            executionLongPrice,
            executionShortPrice
        );
    };

const run = async (account: Account, chainId: StarknetChainId): Promise<void> => {
    try {
        const wssProvider = getProvider(ProviderType.WSS, chainId);
        wssProvider.onClose(() => run(account, chainId));

        // const onDepositCreatedHandler = createOnDepositCreatedHandler(account, chainId);
        await wssProvider.subscribeTo(
            SatoruEvent.DepositCreated,
            onDepositCreatedHandler(account, chainId)
        );
    } catch (error) {
        logger.error(error, "Failed to start");
        throw error;
    }
};

export const createDepositKeeper = () => {
    const { account, chainId } = getNetworkConfig();
    return {
        run: () => run(account, chainId),
    };
};
