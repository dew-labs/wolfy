import type { Account } from "starknet";

import {
    createCall,
    getProvider,
    ProviderType,
    WolfyEvent,
    StarknetChainId,
    toStarknetHexString,
    type WolfyEventHandler,
} from "wolfy-sdk";

import { getWithdrawalHandlerContract } from "@freyr/shared/contracts";
import {
    createLogger,
    executeAndGetResult,
    getDataStoreContract,
    getNetworkConfig,
    getSetPriceParams,
    measureExecutionTime,
} from "@freyr/shared/utils";

import { getOraclePrice } from "../services/pythPriceOracleService";

const logger = createLogger("WithdrawalKeeper");

const executeWithdrawal = async (
    account: Account,
    chainId: StarknetChainId,
    withdrawalKey: string,
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

        const withdrawalHandlerContract = getWithdrawalHandlerContract(chainId, account);

        logger.debug(`Withdrawal ${withdrawalKey}: Executing ...`);

        await executeAndGetResult(
            account,
            createCall(withdrawalHandlerContract, "execute_withdrawal", [
                withdrawalKey,
                priceParams,
            ]),
            (receipt) => {
                logger.debug(
                    `Withdrawal ${withdrawalKey}: Transaction key ${receipt.transaction_hash}`
                );
            },
            `Withdrawal ${withdrawalKey}: Failed to execute`
        );
    }, `Withdrawal ${withdrawalKey}: Executed`);
};

const onWithdrawalCreatedHandler =
    (account: Account, chainId: StarknetChainId): WolfyEventHandler<WolfyEvent.WithdrawalCreated> =>
    async (event) => {
        const { key, market: marketKey } = event;
        const dataStoreContract = getDataStoreContract(chainId, account);

        const withdrawalKey = toStarknetHexString(key);
        const market = await dataStoreContract.get_market(toStarknetHexString(marketKey));
        const longTokenAddress = toStarknetHexString(market.long_token);
        const shortTokenAddress = toStarknetHexString(market.short_token);

        const executionLongPrice = getOraclePrice(longTokenAddress);
        const executionShortPrice = getOraclePrice(shortTokenAddress);

        // TODO: retry
        await executeWithdrawal(
            account,
            chainId,
            withdrawalKey,
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

        await wssProvider.subscribeTo(
            WolfyEvent.WithdrawalCreated,
            onWithdrawalCreatedHandler(account, chainId)
        );
    } catch (error) {
        logger.error(error, "Failed to start");
        throw error;
    }
};

export const createWithdrawalKeeper = () => {
    const { account, chainId } = getNetworkConfig();
    return {
        run: () => run(account, chainId),
    };
};
