import { decimalToFloat, expandDecimals } from "@freyr/shared/utils";
import {
    createCall,
    createWolfyContract,
    createTokenContract,
    DataStoreABI,
    executeAndWait,
    poseidonHash,
    WolfyContract,
    toStarknetHexString,
    type StarknetChainId,
} from "wolfy-sdk";
import * as dataStoreKeys from "wolfy-sdk/dataStore";
import { CairoUint256, type Account, type Call } from "starknet";

const DEFAULT_CONFIG = {
    minCollateralFactor: decimalToFloat(1, 2), // 1%

    minCollateralFactorForOpenInterestMultiplierLong: 0,
    minCollateralFactorForOpenInterestMultiplierShort: 0,

    maxLongTokenPoolAmount: expandDecimals(1_000_000_000_000, 18),
    maxShortTokenPoolAmount: expandDecimals(1_000_000_000_000, 18),

    maxOpenInterestForLongs: decimalToFloat(1_000_000_000),
    maxOpenInterestForShorts: decimalToFloat(1_000_000_000),

    reserveFactorLongs: decimalToFloat(90, 2), // 90%,
    // 1_000000000000000000n
    reserveFactorShorts: decimalToFloat(90, 2), // 90%,
    // 1_000000000000000000n

    openInterestReserveFactorLongs: decimalToFloat(8, 1), // 80%,
    // 1_000000000000000000n
    openInterestReserveFactorShorts: decimalToFloat(8, 1), // 80%,
    // 1_000000000000000000n

    maxPnlFactorForTradersLongs: decimalToFloat(8, 1), // 80%
    maxPnlFactorForTradersShorts: decimalToFloat(8, 1), // 80%

    maxPnlFactorForAdlLongs: decimalToFloat(1, 0), // 100%, no ADL under normal operation
    maxPnlFactorForAdlShorts: decimalToFloat(1, 0), // 100%, no ADL under normal operation

    minPnlFactorAfterAdlLongs: decimalToFloat(8, 1), // 80%, no ADL under normal operation
    minPnlFactorAfterAdlShorts: decimalToFloat(8, 1), // 80%, no ADL under normal operation

    maxPnlFactorForDepositsLongs: decimalToFloat(8, 1), // 80%
    // 50000000000000000_000000000000000000000000000000n
    maxPnlFactorForDepositsShorts: decimalToFloat(8, 1), // 80%
    // 50000000000000000_000000000000000000000000000000n

    maxPnlFactorForWithdrawalsLongs: decimalToFloat(8, 1), // 80%
    // 50000000000000000_000000000000000000000000000000n
    maxPnlFactorForWithdrawalsShorts: decimalToFloat(8, 1), // 80%
    // 50000000000000000_000000000000000000000000000000n

    positionFeeFactorForPositiveImpact: decimalToFloat(5, 4), // 0.05%
    positionFeeFactorForNegativeImpact: decimalToFloat(7, 4), // 0.07%

    negativePositionImpactFactor: decimalToFloat(1, 7), // 0.00001%
    positivePositionImpactFactor: decimalToFloat(5, 8), // 0.000005%
    positionImpactExponentFactor: decimalToFloat(2, 0), // 2

    negativeMaxPositionImpactFactor: decimalToFloat(1, 2), // 1%
    positiveMaxPositionImpactFactor: decimalToFloat(1, 2), // 1%
    maxPositionImpactFactorForLiquidations: decimalToFloat(1, 2), // 1%

    swapFeeFactorForPositiveImpact: decimalToFloat(5, 4), // 0.05%,
    swapFeeFactorForNegativeImpact: decimalToFloat(7, 4), // 0.07%,

    negativeSwapImpactFactor: decimalToFloat(1, 5), // 0.001%
    positiveSwapImpactFactor: decimalToFloat(5, 6), // 0.0005%
    swapImpactExponentFactor: decimalToFloat(2, 0), // 2

    minCollateralUsd: decimalToFloat(1, 0), // 1 USD

    borrowingFactorForLongs: decimalToFloat(5, 9), // 0.000000003, 0.0000003% / second, 15.77% per year if the pool is 100% utilized
    borrowingFactorForShorts: decimalToFloat(5, 9), // 0.000000003, 0.0000003% / second, 15.77% per year if the pool is 100% utilized

    borrowingExponentFactorForLongs: decimalToFloat(1),
    borrowingExponentFactorForShorts: decimalToFloat(1),

    fundingFactor: decimalToFloat(2, 8), // ~63% per year for a 100% skew
    fundingExponentFactor: decimalToFloat(1),
};

const SYNTHETIC_MARKET_CONFIG = {
    reserveFactorLongs: decimalToFloat(7, 1), // 70%,
    reserveFactorShorts: decimalToFloat(7, 1), // 70%,

    openInterestReserveFactorLongs: decimalToFloat(5, 1), // 50%,
    openInterestReserveFactorShorts: decimalToFloat(5, 1), // 50%,

    maxPnlFactorForTradersLongs: decimalToFloat(5, 1), // 50%
    maxPnlFactorForTradersShorts: decimalToFloat(5, 1), // 50%

    maxPnlFactorForAdlLongs: decimalToFloat(45, 2), // 45%
    maxPnlFactorForAdlShorts: decimalToFloat(45, 2), // 45%

    minPnlFactorAfterAdlLongs: decimalToFloat(4, 1), // 40%
    minPnlFactorAfterAdlShorts: decimalToFloat(4, 1), // 40%

    maxPnlFactorForDepositsLongs: decimalToFloat(6, 1), // 60%
    maxPnlFactorForDepositsShorts: decimalToFloat(6, 1), // 60%

    maxPnlFactorForWithdrawalsLongs: decimalToFloat(3, 1), // 30%
    maxPnlFactorForWithdrawalsShorts: decimalToFloat(3, 1), // 30%
};

const STABLECOIN_SWAPMARKET_CONFIG = {
    swapOnly: true,

    swapFeeFactorForPositiveImpact: decimalToFloat(1, 4), // 0.01%,
    swapFeeFactorForNegativeImpact: decimalToFloat(1, 4), // 0.01%,

    negativeSwapImpactFactor: decimalToFloat(5, 10), // 0.01% for 200,000 USD of imbalance
    positiveSwapImpactFactor: decimalToFloat(5, 10), // 0.01% for 200,000 USD of imbalance
};

export default async function configMarket(
    chainId: StarknetChainId,
    account: Account,
    marketName: string,
    marketToken: string,
    maxLongTokenPoolAmount: number | bigint,
    maxShortTokenPoolAmount: number | bigint
) {
    const dataStoreContract = createWolfyContract(chainId, WolfyContract.DataStore, DataStoreABI);
    const market = await dataStoreContract.get_market(marketToken);

    // const indexTokenAddress = toStarknetHexString(market.index_token);
    const longTokenAddress = toStarknetHexString(market.long_token);
    const shortTokenAddress = toStarknetHexString(market.short_token);
    const marketTokenAddress = toStarknetHexString(market.market_token);

    const longTokenDecimals = await createTokenContract(chainId, longTokenAddress).decimals();
    const shortTokenDecimals = await createTokenContract(chainId, shortTokenAddress).decimals();

    const configData = {
        virtualTokenIdForIndexToken: poseidonHash(`PERP:${marketName}`),
        virtualMarketId: poseidonHash(`SPOT:${marketName}`),

        ...DEFAULT_CONFIG,

        maxLongTokenPoolAmount: expandDecimals(maxLongTokenPoolAmount, longTokenDecimals),
        maxShortTokenPoolAmount: expandDecimals(maxShortTokenPoolAmount, shortTokenDecimals),

        negativePositionImpactFactor: decimalToFloat(12, 11), // 0.05% for 4,166,667 USD of imbalance
        positivePositionImpactFactor: decimalToFloat(12, 11), // 0.05% for 4,166,667 USD of imbalance

        negativeSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance
        positiveSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance

        // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
        minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
        minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),
    };

    console.log("Begin config...");

    const calls: Call[] = [];

    // -----------------------------------------------------------------------------------------------------------------

    const virtualTokenIdForIndexTokenKey = dataStoreKeys.virtualTokenIdKey(
        configData.virtualTokenIdForIndexToken
    );
    calls.push({
        contractAddress: dataStoreContract.address,
        entrypoint: "set_felt252",
        calldata: [virtualTokenIdForIndexTokenKey, configData.virtualTokenIdForIndexToken],
    });
    const virtualTokenIdForMarketToken = dataStoreKeys.virtualMarketIdKey(
        configData.virtualTokenIdForIndexToken
    );
    calls.push({
        contractAddress: dataStoreContract.address,
        entrypoint: "set_felt252",
        calldata: [virtualTokenIdForMarketToken, configData.virtualMarketId],
    });

    // -----------------------------------------------------------------------------------------------------------------

    calls.push(
        createCall(dataStoreContract, "set_u256", [dataStoreKeys.REQUEST_EXPIRATION_BLOCK_AGE, 0])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // maxLongTokenPoolAmount
    const maxLongTokenPoolAmountKey = dataStoreKeys.maxPoolAmountKey(
        marketTokenAddress,
        longTokenAddress
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxLongTokenPoolAmountKey,
            new CairoUint256(configData.maxLongTokenPoolAmount),
        ])
    );

    // maxShortTokenPoolAmount
    const maxShortTokenPoolAmountKey = dataStoreKeys.maxPoolAmountKey(
        marketTokenAddress,
        shortTokenAddress
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxShortTokenPoolAmountKey,
            new CairoUint256(configData.maxShortTokenPoolAmount),
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // reserveFactorLongs
    const reserveFactorLongsKey = dataStoreKeys.reserveFactorKey(marketTokenAddress, true);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            reserveFactorLongsKey,
            new CairoUint256(configData.reserveFactorLongs),
        ])
    );

    // reserveFactorShorts
    const reserveFactorShortsKey = dataStoreKeys.reserveFactorKey(marketTokenAddress, false);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            reserveFactorShortsKey,
            new CairoUint256(configData.reserveFactorShorts),
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // maxOpenInterestForLongs
    const maxOpenInterestForLongsKey = dataStoreKeys.maxOpenInterestKey(marketTokenAddress, true);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxOpenInterestForLongsKey,
            configData.maxOpenInterestForLongs,
        ])
    );

    // maxOpenInterestForShorts
    const maxOpenInterestForShortsKey = dataStoreKeys.maxOpenInterestKey(marketTokenAddress, false);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxOpenInterestForShortsKey,
            configData.maxOpenInterestForShorts,
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // openInterestReserveFactorLongs
    const openInterestReserveFactorLongsKey = dataStoreKeys.openInterestReserveFactorKey(
        marketTokenAddress,
        true
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            openInterestReserveFactorLongsKey,
            new CairoUint256(configData.openInterestReserveFactorLongs),
        ])
    );

    // openInterestReserveFactorShorts
    const openInterestReserveFactorShortsKey = dataStoreKeys.openInterestReserveFactorKey(
        marketTokenAddress,
        false
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            openInterestReserveFactorShortsKey,
            new CairoUint256(configData.openInterestReserveFactorShorts),
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // maxPnlFactorForDepositsLongs;
    const maxPnlFactorForDepositsLongsKey = dataStoreKeys.maxPnlFactorKey(
        dataStoreKeys.MAX_PNL_FACTOR_FOR_DEPOSITS,
        marketTokenAddress,
        true
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForDepositsLongsKey,
            new CairoUint256(configData.maxPnlFactorForDepositsLongs),
        ])
    );

    // maxPnlFactorForDepositsShorts
    const maxPnlFactorForDepositsShortsKey = dataStoreKeys.maxPnlFactorKey(
        dataStoreKeys.MAX_PNL_FACTOR_FOR_DEPOSITS,
        marketTokenAddress,
        false
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForDepositsShortsKey,
            new CairoUint256(configData.maxPnlFactorForDepositsShorts),
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // maxPnlFactorForWithdrawalsLongs;
    const maxPnlFactorForWithdrawalsLongsKey = dataStoreKeys.maxPnlFactorKey(
        dataStoreKeys.MAX_PNL_FACTOR_FOR_WITHDRAWALS,
        marketTokenAddress,
        true
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForWithdrawalsLongsKey,
            new CairoUint256(configData.maxPnlFactorForWithdrawalsLongs),
        ])
    );

    // maxPnlFactorForWithdrawalsShorts
    const maxPnlFactorForWithdrawalsShortsKey = dataStoreKeys.maxPnlFactorKey(
        dataStoreKeys.MAX_PNL_FACTOR_FOR_WITHDRAWALS,
        marketTokenAddress,
        false
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForWithdrawalsShortsKey,
            new CairoUint256(configData.maxPnlFactorForWithdrawalsShorts),
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // // borrowingFactorForLongs
    // const borrowingFactorForLongsKey = dataStoreKeys.borrowingFactorKey(marketTokenAddress, true);
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         borrowingFactorForLongsKey,
    //         configData.borrowingFactorForLongs,
    //     ])
    // );

    // // borrowingFactorForShorts
    // const borrowingFactorForShortsKey = dataStoreKeys.borrowingFactorKey(marketTokenAddress, false);
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         borrowingFactorForShortsKey,
    //         configData.borrowingFactorForShorts,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // // borrowingExponentFactorForLongs
    // const borrowingExponentFactorForLongsKey = dataStoreKeys.borrowingExponentFactorKey(
    //     marketTokenAddress,
    //     true
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         borrowingExponentFactorForLongsKey,
    //         configData.borrowingExponentFactorForLongs,
    //     ])
    // );

    // // borrowingExponentFactorForShorts
    // const borrowingExponentFactorForShortsKey = dataStoreKeys.borrowingExponentFactorKey(
    //     marketTokenAddress,
    //     false
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         borrowingExponentFactorForShortsKey,
    //         configData.borrowingExponentFactorForShorts,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // // maxPnlFactorForTradersLongs
    // const maxPnlFactorForTradersLongsKey = dataStoreKeys.maxPnlFactorKey(
    //     dataStoreKeys.MAX_PNL_FACTOR_FOR_TRADERS,
    //     marketTokenAddress,
    //     true
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         maxPnlFactorForTradersLongsKey,
    //         configData.maxPnlFactorForTradersLongs,
    //     ])
    // );

    // // maxPnlFactorForTradersShorts
    // const maxPnlFactorForTradersShortsKey = dataStoreKeys.maxPnlFactorKey(
    //     dataStoreKeys.MAX_PNL_FACTOR_FOR_TRADERS,
    //     marketTokenAddress,
    //     false
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         maxPnlFactorForTradersShortsKey,
    //         configData.maxPnlFactorForTradersShorts,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // // maxPnlFactorForAdlLongs
    // const maxPnlFactorForAdlLongsKey = dataStoreKeys.maxPnlFactorKey(
    //     dataStoreKeys.MAX_PNL_FACTOR_FOR_ADL,
    //     marketTokenAddress,
    //     true
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         maxPnlFactorForAdlLongsKey,
    //         configData.maxPnlFactorForAdlLongs,
    //     ])
    // );

    // // maxPnlFactorForAdlShorts
    // const maxPnlFactorForAdlShortsKey = dataStoreKeys.maxPnlFactorKey(
    //     dataStoreKeys.MAX_PNL_FACTOR_FOR_ADL,
    //     marketTokenAddress,
    //     false
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         maxPnlFactorForAdlShortsKey,
    //         configData.maxPnlFactorForAdlShorts,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // // minPnlFactorAfterAdlLongs
    // const minPnlFactorAfterAdlLongsKey = dataStoreKeys.minPnlFactorAfterAdl(
    //     marketTokenAddress,
    //     true
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         minPnlFactorAfterAdlLongsKey,
    //         configData.minPnlFactorAfterAdlLongs,
    //     ])
    // );

    // // minPnlFactorAfterAdlShorts
    // const minPnlFactorAfterAdlShortsKey = dataStoreKeys.minPnlFactorAfterAdl(
    //     marketTokenAddress,
    //     false
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         minPnlFactorAfterAdlShortsKey,
    //         configData.minPnlFactorAfterAdlShorts,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // // Insufficient collateral usd
    // // minCollateralFactorForOpenInterestMultiplierLong
    // const minCollateralFactorForOpenInterestMultiplierLongKey =
    //     dataStoreKeys.minCollateralFactorForOpenInterest(marketTokenAddress, true);
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         minCollateralFactorForOpenInterestMultiplierLongKey,
    //         configData.minCollateralFactorForOpenInterestMultiplierLong,
    //     ])
    // );

    // // minCollateralFactorForOpenInterestMultiplierShort
    // const minCollateralFactorForOpenInterestMultiplierShortKey =
    //     dataStoreKeys.minCollateralFactorForOpenInterest(marketTokenAddress, false);
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         minCollateralFactorForOpenInterestMultiplierShortKey,
    //         configData.minCollateralFactorForOpenInterestMultiplierShort,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // // negativeSwapImpactFactor
    // const negativeSwapImpactFactorKey = dataStoreKeys.swapImpactFactorKey(
    //     marketTokenAddress,
    //     false
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         negativeSwapImpactFactorKey,
    //         configData.negativeSwapImpactFactor,
    //     ])
    // );

    // // positiveSwapImpactFactor
    // const positiveSwapImpactFactorKey = dataStoreKeys.swapImpactFactorKey(marketTokenAddress, true);
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         positiveSwapImpactFactorKey,
    //         configData.positiveSwapImpactFactor,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // // Price impact larger order size
    // // negativePositionImpactFactor
    // const negativePositionImpactFactorKey = dataStoreKeys.positionImpactFactorKey(
    //     marketTokenAddress,
    //     false
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         negativePositionImpactFactorKey,
    //         configData.negativePositionImpactFactor,
    //     ])
    // );

    // // positivePositionImpactFactor
    // const positivePositionImpactFactorKey = dataStoreKeys.positionImpactFactorKey(
    //     marketTokenAddress,
    //     false
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         positivePositionImpactFactorKey,
    //         configData.positivePositionImpactFactor,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // // positiveMaxPositionImpactFactor
    // const positiveMaxPositionImpactFactorKey = dataStoreKeys.maxPositionImpactFactorKey(
    //     marketTokenAddress,
    //     true
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         positiveMaxPositionImpactFactorKey,
    //         configData.positiveMaxPositionImpactFactor,
    //     ])
    // );

    // // negativeMaxPositionImpactFactor
    // const negativeMaxPositionImpactFactorKey = dataStoreKeys.maxPositionImpactFactorKey(
    //     marketTokenAddress,
    //     false
    // );
    // calls.push(
    //     createCall(dataStoreContract, "set_u256", [
    //         negativeMaxPositionImpactFactorKey,
    //         configData.negativeMaxPositionImpactFactor,
    //     ])
    // );

    // -----------------------------------------------------------------------------------------------------------------

    // maxPositionImpactFactorForLiquidations
    const maxPositionImpactFactorForLiquidationsKey =
        dataStoreKeys.maxPositionImpactFactorForLiquidationsKey(marketTokenAddress);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPositionImpactFactorForLiquidationsKey,
            configData.maxPositionImpactFactorForLiquidations,
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    await executeAndWait(account, calls);

    console.log("All config done.");
}
