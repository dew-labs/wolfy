import pRetry from "p-retry";
import {
    SatoruContract,
    StarknetChainId,
    toStarknetHexString,
    type SatoruContractAbi,
} from "satoru-sdk";
import { type Account, type TypedContractV2 } from "starknet";

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
    getPosition,
    getSetPriceParams,
    measureExecutionTime,
    type ContractMarket,
    type ContractPosition,
} from "@freyr/shared/utils";

import { loadPositions } from "../services/positionPersistenceService";
import { getOraclePrice } from "../services/pythPriceOracleService";

const logger = createLogger("LiquidationKeeper");

type ContractSetup = {
    account: Account;
    chainId: StarknetChainId;
    hermesUrl: string;
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>;
    readerContract: TypedContractV2<SatoruContractAbi<SatoruContract.Reader>>;
    liquidationHandlerContract: TypedContractV2<
        SatoruContractAbi<SatoruContract.LiquidationHandler>
    >;
    referralStorageAddress: string;
};

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

const checkIfLiquidable = async (
    readerContract: TypedContractV2<SatoruContractAbi<SatoruContract.Reader>>,
    dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>>,
    referralStorageAddress: string,
    position: ContractPosition,
    market: ContractMarket,
    hermesUrl: string
) => {
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

    return { shouldBeLiquidated, indexTokenPrice, longTokenPrice, shortTokenPrice };
};

const executeLiquidation = async (
    liquidationHandlerContract: TypedContractV2<
        SatoruContractAbi<SatoruContract.LiquidationHandler>
    >,
    account: Account,
    position: ContractPosition,
    market: ContractMarket,
    indexTokenPrice: bigint,
    longTokenPrice: bigint,
    shortTokenPrice: bigint
) => {
    return await measureExecutionTime(async () => {
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
    }, `Position ${position.key}: Liquidated`);
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
    const market: ContractMarket = await getMarket(dataStoreContract, position.market);

    const { shouldBeLiquidated, indexTokenPrice, longTokenPrice, shortTokenPrice } =
        await checkIfLiquidable(
            readerContract,
            dataStoreContract,
            referralStorageAddress,
            position,
            market,
            hermesUrl
        );

    logger.debug({ shouldBeLiquidated, indexTokenPrice, longTokenPrice, shortTokenPrice });

    if (shouldBeLiquidated) {
        logger.debug(`Position ${positionKey}: SHOULD BE liquidated`);
        try {
            await pRetry(
                async () =>
                    await executeLiquidation(
                        liquidationHandlerContract,
                        account,
                        position,
                        market,
                        indexTokenPrice,
                        longTokenPrice,
                        shortTokenPrice
                    ),
                {
                    retries: 3,
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

const checkAndLiquidatePositions = async (contractSetup: ContractSetup) => {
    logger.debug("Checking positions...");

    try {
        const positions = loadPositions();
        await Promise.allSettled(
            positions.map((position) => processPosition(position, contractSetup))
        );
    } catch (error) {
        logger.error(error, "Error during position check:");
    }
    logger.debug(`Positions checked`);
};

export const createLiquidationKeeper = (intervalMinutes: number) => {
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`Checking positions every ${intervalMinutes} minutes`);
    const contractSetup = setupContracts();

    const run = () => {
        const go = () => checkAndLiquidatePositions(contractSetup);
        setInterval(go, intervalMs);
        go();
    };

    return { run };
};
