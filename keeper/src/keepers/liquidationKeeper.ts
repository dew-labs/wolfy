import { type Account, type TypedContractV2 } from "starknet";
import { HermesClient } from "@pythnetwork/hermes-client";
import {
    SatoruContract,
    StarknetChainId,
    toStarknetHexString,
    type SatoruContractAbi,
} from "satoru-sdk";

import type { Position } from "@/shared/interfaces/Position";
import type { Token } from "@/shared/interfaces/Token";
import { USD_DECIMALS } from "@/shared/utils/config";
import {
    getDataStoreContract,
    getLiquidationHandlerContract,
    getReaderContract,
} from "@/shared/utils/contracts/getters";
import { logger } from "@/shared/utils/logger";
import { expandDecimals, getContracts, getNetworkConfig, getTokens } from "@/shared/utils/utils";
import { getSetPriceParams } from "@/shared/utils/utils";

import { loadPositions } from "../services/positionPersistenceService";

interface ContractSetup {
    account: Account;
    chainId: StarknetChainId;
    hermesUrl: string;
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>;
    readerContract: TypedContractV2<SatoruContractAbi<SatoruContract.Reader>>;
    liquidationHandlerContract: TypedContractV2<
        SatoruContractAbi<SatoruContract.LiquidationHandler>
    >;
    referralStorageAddress: string;
}

const setupContracts = (): ContractSetup => {
    const contracts = getContracts();
    const referralStorageAddress = contracts.ReferralStorage;
    if (!referralStorageAddress) throw new Error("ReferralStorage contract required");

    const { account, chainId, hermesUrl } = getNetworkConfig();
    const dataStoreContract = getDataStoreContract(chainId, account);
    const readerContract = getReaderContract(chainId);
    const liquidationHandlerContract = getLiquidationHandlerContract(chainId, account);

    return {
        account,
        chainId,
        hermesUrl,
        dataStoreContract,
        readerContract,
        liquidationHandlerContract,
        referralStorageAddress,
    };
};

const getPosition = async (
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>,
    positionKey: string
) => await dataStoreContract.get_position(positionKey);

const getMarket = async (
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>,
    marketAddress: string
) => await dataStoreContract.get_market(toStarknetHexString(marketAddress));

// TODO: to be removed when PythPriceOracleService is changed to functional
const findTokenByAddress = (tokens: Token[], address: string): Token => {
    const token = tokens.find((token) => token.address === toStarknetHexString(address));
    if (!token) {
        throw new Error(`Token not found for address: ${address}`);
    }
    return token;
};

// TODO: to be removed when PythPriceOracleService is changed to functional
const calculateTokenPrice = (priceUpdate: any, token: Token): bigint => {
    if (!priceUpdate?.price) throw new Error("Price update is null or undefined");

    return (
        expandDecimals(priceUpdate.price.price, USD_DECIMALS - Math.abs(priceUpdate.price.expo)) /
        expandDecimals(1n, BigInt(token.decimals))
    );
};

// TODO: to be removed when PythPriceOracleService is changed to functional
const fetchPrices = async (
    hermesUrl: string,
    market: any
): Promise<{
    indexTokenPrice: bigint;
    longTokenPrice: bigint;
    shortTokenPrice: bigint;
}> => {
    const hermesClient = new HermesClient(hermesUrl, {});
    const tokens: Token[] = getTokens();

    const indexToken = findTokenByAddress(tokens, market.index_token);
    const longToken = findTokenByAddress(tokens, market.long_token);
    const shortToken = findTokenByAddress(tokens, market.short_token);

    const pythPriceIds = [indexToken, longToken, shortToken]
        .map((token) => token?.pythPriceId)
        .filter((id): id is string => id !== undefined);

    const rawPriceUpdates = await hermesClient.getLatestPriceUpdates(pythPriceIds);
    const priceUpdates = rawPriceUpdates.parsed;
    if (!priceUpdates) {
        throw new Error("Price updates are null or undefined");
    }

    return {
        indexTokenPrice: calculateTokenPrice(priceUpdates[0], indexToken),
        longTokenPrice: calculateTokenPrice(priceUpdates[1], longToken),
        shortTokenPrice: calculateTokenPrice(priceUpdates[2], shortToken),
    };
};

const checkIfLiquidable = async (
    readerContract: TypedContractV2<SatoruContractAbi<SatoruContract.Reader>>,
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>,
    referralStorageAddress: string,
    position: any,
    market: any,
    hermesUrl: string
) => {
    // TODO: use function when PythPriceOracleService is changed to functional
    const { indexTokenPrice, longTokenPrice, shortTokenPrice } = await fetchPrices(
        hermesUrl,
        market
    );

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

    return { shouldBeLiquidated, indexTokenPrice, longTokenPrice, shortTokenPrice };
};

const executeLiquidation = async (
    liquidationHandlerContract: TypedContractV2<
        SatoruContractAbi<SatoruContract.LiquidationHandler>
    >,
    account: Account,
    position: any,
    market: any,
    indexTokenPrice: bigint,
    longTokenPrice: bigint,
    shortTokenPrice: bigint
) => {
    const priceParams = await getSetPriceParams(account, [
        [market.index_token, indexTokenPrice],
        [market.long_token, longTokenPrice],
        [market.short_token, shortTokenPrice],
    ]);

    await liquidationHandlerContract.execute_liquidation(
        position.account,
        position.market,
        position.collateral_token,
        position.is_long,
        priceParams
    );
};

const processPosition = async (positionKey: string, contractSetup: ContractSetup) => {
    const {
        dataStoreContract,
        readerContract,
        liquidationHandlerContract,
        account,
        referralStorageAddress,
        hermesUrl,
    } = contractSetup;

    const position = await getPosition(dataStoreContract, positionKey);
    const market = await getMarket(dataStoreContract, position.market);

    const { shouldBeLiquidated, indexTokenPrice, longTokenPrice, shortTokenPrice } =
        await checkIfLiquidable(
            readerContract,
            dataStoreContract,
            referralStorageAddress,
            position,
            market,
            hermesUrl
        );
    console.log(
        "🚀 ~ processPosition ~ { shouldBeLiquidated, indexTokenPrice, longTokenPrice, shortTokenPrice }:",
        { shouldBeLiquidated, indexTokenPrice, longTokenPrice, shortTokenPrice }
    );

    if (shouldBeLiquidated) {
        logger.info(`Position ${positionKey} should be liquidated`);
        try {
            await executeLiquidation(
                liquidationHandlerContract,
                account,
                position,
                market,
                indexTokenPrice,
                longTokenPrice,
                shortTokenPrice
            );
            logger.info(`Liquidation executed for position ${positionKey}`);
        } catch (error) {
            logger.error(error, `[LiquidationKeeper] Failed to liquidate position ${positionKey}:`);
        }
    } else {
        logger.info(`Position ${positionKey} is not liquidable`);
    }
};

const checkAndLiquidatePositions = async (contractSetup: ContractSetup, positions: Position[]) => {
    await Promise.allSettled(
        positions.map((position) => processPosition(position.key, contractSetup))
    );
};

export const startLiquidationKeeper = (intervalMinutes: number) => {
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(
        `[LiquidationKeeper] Starting liquidation keeper. Checking positions every ${intervalMinutes} minutes.`
    );

    const runKeeper = async () => {
        logger.info("Checking positions...");
        try {
            const contractSetup = await setupContracts();
            const positions = loadPositions();
            await checkAndLiquidatePositions(contractSetup, positions);
        } catch (error) {
            logger.error(error, "[LiquidationKeeper] Error during position check:");
        }
        logger.info(`[LiquidationKeeper] Checked positions at ${new Date().toISOString()}`);
    };

    setInterval(runKeeper, intervalMs);
    runKeeper();
};
