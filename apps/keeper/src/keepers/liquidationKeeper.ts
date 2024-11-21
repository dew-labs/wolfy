import pRetry from "p-retry";
import { toStarknetHexString } from "wolfy-sdk";

import {
    getDataStoreContract,
    getLiquidationHandlerContract,
    getReaderContract,
} from "@freyr/shared/contracts";
import {
    createLogger,
    getContracts,
    getMarket,
    getNetworkConfig,
    getOpenPositionKeys,
    getPosition,
    getSetPriceParams,
    measureExecutionTime,
    setOpenPositionKeys,
    type ContractMarket,
    type ContractPosition,
} from "@freyr/shared/utils";

import { getOraclePrice } from "../services/pythPriceOracleService";
import invariant from "tiny-invariant";
import { fetchOpenPositionKeys } from "../graphql/services/positionService";

const logger = createLogger("LiquidationKeeper");

const checkIfLiquidable = async (positionKey: string) => {
    const { chainId } = getNetworkConfig();

    // TODO: refactor
    const contracts = getContracts();
    const referralStorageAddress = contracts.ReferralStorage;
    invariant(referralStorageAddress, "ReferralStorage contract required");

    const dataStoreContract = getDataStoreContract(chainId);
    const readerContract = getReaderContract(chainId);

    const position = await getPosition(dataStoreContract, positionKey);
    const market: ContractMarket = await getMarket(dataStoreContract, position.market);

    const indexTokenAddress = toStarknetHexString(market.index_token);
    const longTokenAddress = toStarknetHexString(market.long_token);
    const shortTokenAddress = toStarknetHexString(market.short_token);

    const indexTokenPrice = getOraclePrice(indexTokenAddress);
    const longTokenPrice = getOraclePrice(longTokenAddress);
    const shortTokenPrice = getOraclePrice(shortTokenAddress);

    const { 0: shouldBeLiquidated, 1: rawReason } = await readerContract.is_position_liquidable(
        { contract_address: dataStoreContract.address },
        { contract_address: referralStorageAddress },
        position,
        market,
        {
            index_token_price: { min: indexTokenPrice, max: indexTokenPrice },
            long_token_price: { min: longTokenPrice, max: longTokenPrice },
            short_token_price: { min: shortTokenPrice, max: shortTokenPrice },
        },
        true
    );

    logger.debug({ shouldBeLiquidated, indexTokenPrice, longTokenPrice, shortTokenPrice });
    return {
        position,
        market,
        shouldBeLiquidated,
        indexTokenPrice,
        longTokenPrice,
        shortTokenPrice,
    };
};

const executeLiquidation = async (
    position: ContractPosition,
    market: ContractMarket,
    indexTokenPrice: bigint,
    longTokenPrice: bigint,
    shortTokenPrice: bigint
) => {
    return await measureExecutionTime(async () => {
        const { account, chainId } = getNetworkConfig();

        const priceParams = await getSetPriceParams(account, [
            [market.index_token, indexTokenPrice],
            [market.long_token, longTokenPrice],
            [market.short_token, shortTokenPrice],
        ]);

        const liquidationHandlerContract = getLiquidationHandlerContract(chainId, account);

        await liquidationHandlerContract.execute_liquidation(
            position.account,
            position.market,
            position.collateral_token,
            position.is_long,
            priceParams
        );
    }, `Position ${position.key}: Liquidated`);
};

const processPosition = async (positionKey: string) => {
    const {
        position,
        market,
        shouldBeLiquidated,
        indexTokenPrice,
        longTokenPrice,
        shortTokenPrice,
    } = await checkIfLiquidable(positionKey);

    if (shouldBeLiquidated) {
        logger.debug(`Position ${positionKey}: SHOULD BE liquidated`);
        try {
            await pRetry(
                async () =>
                    await executeLiquidation(
                        position,
                        market,
                        indexTokenPrice,
                        longTokenPrice,
                        shortTokenPrice
                    ),
                {
                    retries: 3,
                    onFailedAttempt: (error) => {
                        logger.error(
                            `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`
                        );
                        logger.error(error.message);
                    },
                    minTimeout: 0,
                    maxTimeout: 0,
                }
            );
        } catch (error) {
            logger.error(error, `Position ${positionKey}: Failed to liquidate`);
        }
    } else {
        logger.debug(`Position ${positionKey}: IS NOT liquidable`);
    }
};

const checkAndLiquidatePositions = async () => {
    logger.debug("Checking positions...");

    try {
        const positionKeys = getOpenPositionKeys();
        logger.debug(positionKeys, `Found ${positionKeys.length} positions to check`);
        await Promise.allSettled(positionKeys.map((positionKey) => processPosition(positionKey)));
    } catch (error) {
        logger.error(error, "Error during position check:");
    }
    logger.debug(`Positions checked`);
};

const initializeOpenPositionKeys = async (): Promise<void> => {
    const openPositionKeys = await fetchOpenPositionKeys();

    setOpenPositionKeys(openPositionKeys);
};

export const createLiquidationKeeper = (intervalMinutes: number) => {
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`Checking positions every ${intervalMinutes} minutes`);

    initializeOpenPositionKeys();

    const run = () => {
        setInterval(checkAndLiquidatePositions, intervalMs);
    };

    return { run };
};
