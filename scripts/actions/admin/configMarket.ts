import { createAsker, decimalToFloat, expandDecimals, settingUp } from "@/shared/utils/utils";

import * as dataStoreKeys from "@/shared/utils/dataStore";
import {
    createCall,
    createSatoruContract,
    DataStoreABI,
    executeAndWait,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { CairoUint256, type Call } from "starknet";

const DEFAULT_CONFIG = {
    minCollateralFactor: decimalToFloat(1, 2), // 1%

    minCollateralFactorForOpenInterestMultiplierLong: 0,
    minCollateralFactorForOpenInterestMultiplierShort: 0,

    maxLongTokenPoolAmount: expandDecimals(1_000_000_000_000, 18),
    maxShortTokenPoolAmount: expandDecimals(1_000_000_000_000, 18),

    maxLongTokenPoolAmountForDeposit: expandDecimals(100_000_000_000, 18),
    maxShortTokenPoolAmountForDeposit: expandDecimals(100_000_000_000, 18),

    maxOpenInterestForLongs: decimalToFloat(1_000_000_000),
    maxOpenInterestForShorts: decimalToFloat(1_000_000_000),

    reserveFactorLongs: decimalToFloat(95, 2), // 95%,
    reserveFactorShorts: decimalToFloat(95, 2), // 95%,

    openInterestReserveFactorLongs: decimalToFloat(9, 1), // 90%,
    openInterestReserveFactorShorts: decimalToFloat(9, 1), // 90%,

    maxPnlFactorForTradersLongs: decimalToFloat(8, 1), // 80%
    maxPnlFactorForTradersShorts: decimalToFloat(8, 1), // 80%

    maxPnlFactorForAdlLongs: decimalToFloat(1, 0), // 100%, no ADL under normal operation
    maxPnlFactorForAdlShorts: decimalToFloat(1, 0), // 100%, no ADL under normal operation

    minPnlFactorAfterAdlLongs: decimalToFloat(8, 1), // 80%, no ADL under normal operation
    minPnlFactorAfterAdlShorts: decimalToFloat(8, 1), // 80%, no ADL under normal operation

    maxPnlFactorForDepositsLongs: decimalToFloat(8, 1), // 80%
    maxPnlFactorForDepositsShorts: decimalToFloat(8, 1), // 80%

    maxPnlFactorForWithdrawalsLongs: decimalToFloat(8, 1), // 80%
    maxPnlFactorForWithdrawalsShorts: decimalToFloat(8, 1), // 80%

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

    // factor in open interest reserve factor 80%
    borrowingFactorForLongs: decimalToFloat(625, 11), // 0.00000000625 * 80% = 0.000000005, 0.0000005% / second, 15.77% per year if the pool is 100% utilized
    borrowingFactorForShorts: decimalToFloat(625, 11), // 0.00000000625 * 80% = 0.000000005, 0.0000005% / second, 15.77% per year if the pool is 100% utilized

    borrowingExponentFactorForLongs: decimalToFloat(1),
    borrowingExponentFactorForShorts: decimalToFloat(1),

    fundingFactor: decimalToFloat(2, 8), // ~63% per year for a 100% skew
    fundingExponentFactor: decimalToFloat(1),

    fundingIncreaseFactorPerSecond: 0,
    fundingDecreaseFactorPerSecond: 0,
    thresholdForStableFunding: 0,
    thresholdForDecreaseFunding: 0,
    minFundingFactorPerSecond: 0,
    maxFundingFactorPerSecond: 0,

    positionImpactPoolDistributionRate: 0,
    minPositionImpactPoolAmount: 0,
};

async function config() {
    const configData = {
        ...DEFAULT_CONFIG,

        // ---------------------------------------------------------------------

        // virtualTokenIdForIndexToken: getKey("PERP:ETH/USD"),
        // virtualMarketId: getKey("SPOT:ETH/USD"),

        // ---------------------------------------------------------------------

        // maxLongTokenPoolAmount: expandDecimals(26_700, 18),
        // maxShortTokenPoolAmount: expandDecimals(60_000_000, 6),

        // maxLongTokenPoolAmountForDeposit: expandDecimals(24_500, 18),
        // maxShortTokenPoolAmountForDeposit: expandDecimals(55_000_000, 6),

        negativePositionImpactFactor: decimalToFloat(15, 11), // 0.05% for ~1,600,000 USD of imbalance
        positivePositionImpactFactor: decimalToFloat(9, 11), // 0.05% for ~2,700,000 USD of imbalance

        positionImpactPoolDistributionRate: expandDecimals(256, 41), // ~2.21 ETH/day
        minPositionImpactPoolAmount: expandDecimals(24, 18), // 24 ETH

        negativeSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance
        positiveSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance

        // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
        minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
        minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

        // maxOpenInterestForLongs: decimalToFloat(64_000_000),
        // maxOpenInterestForShorts: decimalToFloat(64_000_000),

        fundingIncreaseFactorPerSecond: decimalToFloat(8, 13), // 0.0000000000008, at least 3.5 hours to reach max funding
        fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
        minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
        maxFundingFactorPerSecond: decimalToFloat(1, 8), // 0.000001%,  0.0036% per hour, 31.5% per year
        thresholdForStableFunding: decimalToFloat(5, 2), // 5%
        thresholdForDecreaseFunding: decimalToFloat(0), // 0%

        borrowingFactorForLongs: decimalToFloat(720, 14), // 7.20e-12, 23.53% at 100% utilisation
        borrowingFactorForShorts: decimalToFloat(720, 14), // 7.20e-12, 23.53% at 100% utilisation

        borrowingExponentFactorForLongs: decimalToFloat(14, 1), // 1.4
        borrowingExponentFactorForShorts: decimalToFloat(14, 1), // 1.4
    };

    const { account, chainId } = await settingUp();

    const dataStoreContract = createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI);

    const { ask, doneAsking } = createAsker();

    let marketToken = await ask("Enter market token (default to last market)");

    if (!marketToken) {
        const marketCount = BigInt(await dataStoreContract.get_market_count());
        if (marketCount === 0n) throw new Error("No market available");
        const lastMarket = (
            await dataStoreContract.get_market_keys(marketCount - 1n, marketCount)
        )[0];
        if (!lastMarket) throw new Error("Invalid market");
        marketToken = toStarknetHexString(lastMarket);
        console.log("Market:", marketToken);
    }

    const market = await dataStoreContract.get_market(marketToken);

    const indexTokenAddress = toStarknetHexString(market.index_token);
    const longTokenAddress = toStarknetHexString(market.long_token);
    const shortTokenAddress = toStarknetHexString(market.short_token);
    const marketTokenAddress = toStarknetHexString(market.market_token);

    console.log("Begin config...");

    const calls: Call[] = [];

    // -----------------------------------------------------------------------------------------------------------------

    // const virtualTokenCalls = [];
    // const virtualTokenIdForIndexTokenKey = dataStoreKeys.virtualTokenIdKey(
    //     configData.virtualTokenIdForIndexToken
    // );
    // virtualTokenCalls.push({
    //     contractAddress: dataStoreContract.address,
    //     entrypoint: "set_felt252",
    //     calldata: [virtualTokenIdForIndexTokenKey, configData.virtualTokenIdForIndexToken],
    // });
    // const virtualTokenIdForMarketToken = dataStoreKeys.virtualMarketIdKey(
    //     configData.virtualTokenIdForIndexToken
    // );
    // virtualTokenCalls.push({
    //     contractAddress: dataStoreContract.address,
    //     entrypoint: "set_felt252",
    //     calldata: [virtualTokenIdForMarketToken, configData.virtualMarketId],
    // });
    // await executeAndWait(account, virtualTokenCalls);

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
            // configData.maxLongTokenPoolAmount,
            new CairoUint256(5000000000000000000000000000000000000000000),
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
            // configData.maxShortTokenPoolAmount,
            new CairoUint256(2500000000000000000000000000000000000000000000),
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // reserveFactorLongs
    const reserveFactorLongsKey = dataStoreKeys.reserveFactorKey(marketTokenAddress, true);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            reserveFactorLongsKey,
            // configData.reserveFactorLongs,
            new CairoUint256(1000000000000000000n),
        ])
    );

    // reserveFactorShorts
    const reserveFactorShortsKey = dataStoreKeys.reserveFactorKey(marketTokenAddress, false);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            reserveFactorShortsKey,
            // configData.reserveFactorShorts,
            new CairoUint256(1000000000000000000n),
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
            // configData.openInterestReserveFactorLongs,
            new CairoUint256(1000000000000000000n),
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
            // configData.openInterestReserveFactorShorts,
            new CairoUint256(1000000000000000000n),
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // maxPnlFactorForDepositsLongs;
    const maxPnlFactorForDepositsLongsKey = dataStoreKeys.maxPnlFactorKey(
        dataStoreKeys.MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
        marketTokenAddress,
        true
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForDepositsLongsKey,
            // configData.maxPnlFactorForDepositsLongs,
            new CairoUint256(50000000000000000000000000000000000000000000000n),
        ])
    );

    // maxPnlFactorForDepositsShorts
    const maxPnlFactorForDepositsShortsKey = dataStoreKeys.maxPnlFactorKey(
        dataStoreKeys.MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
        marketTokenAddress,
        false
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForDepositsShortsKey,
            // configData.maxPnlFactorForDepositsShorts,
            new CairoUint256(50000000000000000000000000000000000000000000000n),
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // maxPnlFactorForWithdrawalsLongs;
    const maxPnlFactorForWithdrawalsLongsKey = dataStoreKeys.maxPnlFactorKey(
        dataStoreKeys.MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
        marketTokenAddress,
        true
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForWithdrawalsLongsKey,
            // configData.maxPnlFactorForWithdrawalsLongs,
            new CairoUint256(50000000000000000000000000000000000000000000000n),
        ])
    );

    // maxPnlFactorForWithdrawalsShorts
    const maxPnlFactorForWithdrawalsShortsKey = dataStoreKeys.maxPnlFactorKey(
        dataStoreKeys.MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
        marketTokenAddress,
        false
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForWithdrawalsShortsKey,
            // configData.maxPnlFactorForWithdrawalsShorts,
            new CairoUint256(50000000000000000000000000000000000000000000000n),
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
    //     dataStoreKeys.MAX_PNL_FACTOR_FOR_TRADERS_KEY,
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
    //     dataStoreKeys.MAX_PNL_FACTOR_FOR_TRADERS_KEY,
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
    doneAsking();
}

config();
