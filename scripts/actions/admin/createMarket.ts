import { CairoUint256, num, shortString, type AccountInterface } from "starknet";
import { createAsker, getKey, settingUp } from "../../utils";
import {
    createCall,
    createSatoruContract,
    createTokenContract,
    DataStoreABI,
    executeAndWait,
    MarketFactoryABI,
    SatoruContract,
    type StarknetChainId,
} from "satoru-sdk";

async function configOriginal(
    chainId: StarknetChainId,
    account: AccountInterface,
    marketTokenAddress: string,
    longTokenAddress: string,
    shortTokenAddress: string
) {
    const dataStoreContract = createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI);

    const factorForDeposits = getKey("MAX_PNL_FACTOR_FOR_DEPOSITS");
    const factorForWithdrawals = getKey("MAX_PNL_FACT_FOR_WITHDRAWALS");

    const maxPoolAmountLongKey = await dataStoreContract.get_max_pool_amount_key(
        marketTokenAddress,
        longTokenAddress
    );

    const maxPoolAmountShortKey = await dataStoreContract.get_max_pool_amount_key(
        marketTokenAddress,
        shortTokenAddress
    );

    const maxPnlFactorForDepositsLongKey = await dataStoreContract.get_max_pnl_factor_key(
        factorForDeposits,
        marketTokenAddress,
        true
    );

    const maxPnlFactorForDepositsShortKey = await dataStoreContract.get_max_pnl_factor_key(
        factorForDeposits,
        marketTokenAddress,
        false
    );

    const maxPnlFactorForWithdrawalsLongKey = await dataStoreContract.get_max_pnl_factor_key(
        factorForWithdrawals,
        marketTokenAddress,
        true
    );

    const maxPnlFactorForWithdrawalsShortKey = await dataStoreContract.get_max_pnl_factor_key(
        factorForWithdrawals,
        marketTokenAddress,
        false
    );

    const reserveFactorLongKey = await dataStoreContract.get_reserve_factor_key(
        marketTokenAddress,
        true
    );

    const reserveFactorShortKey = await dataStoreContract.get_reserve_factor_key(
        marketTokenAddress,
        false
    );

    const openInterestReserveFactorLongKey =
        await dataStoreContract.get_open_interest_reserve_factor_key(marketTokenAddress, true);

    const openInterestReserveFactorShortKey =
        await dataStoreContract.get_open_interest_reserve_factor_key(marketTokenAddress, false);

    // Set constants for trade
    // set max pool for long token
    await executeAndWait(account, [
        createCall(dataStoreContract, "set_u256", [
            maxPoolAmountLongKey,
            new CairoUint256(5000000000000000000000000000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            maxPoolAmountShortKey,
            new CairoUint256(2500000000000000000000000000000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForDepositsLongKey,
            new CairoUint256(50000000000000000000000000000000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForDepositsShortKey,
            new CairoUint256(50000000000000000000000000000000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForWithdrawalsLongKey,
            new CairoUint256(50000000000000000000000000000000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            maxPnlFactorForWithdrawalsShortKey,
            new CairoUint256(50000000000000000000000000000000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            reserveFactorLongKey,
            new CairoUint256(1000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            reserveFactorShortKey,
            new CairoUint256(1000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            openInterestReserveFactorLongKey,
            new CairoUint256(1000000000000000000),
        ]),
        createCall(dataStoreContract, "set_u256", [
            openInterestReserveFactorShortKey,
            new CairoUint256(1000000000000000000),
        ]),
    ]);
}

async function createMarket() {
    const { account, chainId } = await settingUp();
    const { ask, doneAsking } = createAsker();

    const indexTokenAddress = await ask("Enter index token address");
    const longTokenAddress =
        (await ask("Enter long token address  (default to index token)")) || indexTokenAddress;
    const shortTokenAddress = await ask("Enter short token address");

    const indexTokenContract = createTokenContract(chainId, indexTokenAddress, account);
    const longTokenContract = createTokenContract(chainId, longTokenAddress, account);
    const shortTokenContract = createTokenContract(chainId, shortTokenAddress, account);

    const indexTokenName = shortString.decodeShortString(
        num.toHex(await indexTokenContract.symbol())
    );
    const longTokenName = shortString.decodeShortString(
        num.toHex(await longTokenContract.symbol())
    );
    const shortTokenName = shortString.decodeShortString(
        num.toHex(await shortTokenContract.symbol())
    );

    console.log("Index token:", indexTokenName);
    console.log("Long token:", longTokenName);
    console.log("Short token:", shortTokenName);

    const marketFactoryContract = createSatoruContract(
        chainId,
        SatoruContract.MarketFactory,
        MarketFactoryABI,
        account
    );

    // BEGIN create market

    let marketTokenAddress;

    try {
        // create market
        const rec = await executeAndWait(
            account,
            createCall(marketFactoryContract, "create_market", [
                indexTokenAddress,
                longTokenAddress,
                shortTokenAddress,
                "market_type",
            ])
        );

        if (rec.isSuccess()) {
            marketTokenAddress = rec.events[0]?.data[1];
            console.log("MARKET_TOKEN=" + marketTokenAddress);
        } else {
            throw new Error("Failed to create market");
        }
    } catch (error) {
        throw new Error("Market already settled or error occurred:", { cause: error });
    }

    if (!marketTokenAddress) return;

    // END create market

    await configOriginal(chainId, account, marketTokenAddress, longTokenAddress, shortTokenAddress);
    doneAsking();
}

async function justConfig() {
    const { account, chainId } = await settingUp();
    const { ask, doneAsking } = createAsker();

    const marketTokenAddress = await ask("Enter market token address");

    if (!marketTokenAddress) throw new Error("Must enter market token");

    const dataStoreContract = createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI);

    const market = await dataStoreContract.get_market(marketTokenAddress);

    const longTokenAddress = market.long_token;
    const shortTokenAddress = market.short_token;

    // await configMarket(chainId, account, marketTokenAddress, longTokenAddress, shortTokenAddress);
    await configOriginal(chainId, account, marketTokenAddress, longTokenAddress, shortTokenAddress);
    doneAsking();
}

createMarket();


// import * as dataStoreKeys from "./dataStoreKeys";

// const DEFAULT_CONFIG = {
//     minCollateralFactor: decimalToFloat(1, 2), // 1%

//     minCollateralFactorForOpenInterestMultiplierLong: 0,
//     minCollateralFactorForOpenInterestMultiplierShort: 0,

//     maxLongTokenPoolAmount: expandDecimals(1_000_000_000_000, 18),
//     maxShortTokenPoolAmount: expandDecimals(1_000_000_000_000, 18),

//     maxLongTokenPoolAmountForDeposit: expandDecimals(100_000_000_000, 18),
//     maxShortTokenPoolAmountForDeposit: expandDecimals(100_000_000_000, 18),

//     maxOpenInterestForLongs: decimalToFloat(1_000_000_000),
//     maxOpenInterestForShorts: decimalToFloat(1_000_000_000),

//     reserveFactorLongs: decimalToFloat(95, 2), // 95%,
//     reserveFactorShorts: decimalToFloat(95, 2), // 95%,

//     openInterestReserveFactorLongs: decimalToFloat(9, 1), // 90%,
//     openInterestReserveFactorShorts: decimalToFloat(9, 1), // 90%,

//     maxPnlFactorForTradersLongs: decimalToFloat(8, 1), // 80%
//     maxPnlFactorForTradersShorts: decimalToFloat(8, 1), // 80%

//     maxPnlFactorForAdlLongs: decimalToFloat(1, 0), // 100%, no ADL under normal operation
//     maxPnlFactorForAdlShorts: decimalToFloat(1, 0), // 100%, no ADL under normal operation

//     minPnlFactorAfterAdlLongs: decimalToFloat(8, 1), // 80%, no ADL under normal operation
//     minPnlFactorAfterAdlShorts: decimalToFloat(8, 1), // 80%, no ADL under normal operation

//     maxPnlFactorForDepositsLongs: decimalToFloat(8, 1), // 80%
//     maxPnlFactorForDepositsShorts: decimalToFloat(8, 1), // 80%

//     maxPnlFactorForWithdrawalsLongs: decimalToFloat(8, 1), // 80%
//     maxPnlFactorForWithdrawalsShorts: decimalToFloat(8, 1), // 80%

//     positionFeeFactorForPositiveImpact: decimalToFloat(5, 4), // 0.05%
//     positionFeeFactorForNegativeImpact: decimalToFloat(7, 4), // 0.07%

//     negativePositionImpactFactor: decimalToFloat(1, 7), // 0.00001%
//     positivePositionImpactFactor: decimalToFloat(5, 8), // 0.000005%
//     positionImpactExponentFactor: decimalToFloat(2, 0), // 2

//     negativeMaxPositionImpactFactor: decimalToFloat(1, 2), // 1%
//     positiveMaxPositionImpactFactor: decimalToFloat(1, 2), // 1%
//     maxPositionImpactFactorForLiquidations: decimalToFloat(1, 2), // 1%

//     swapFeeFactorForPositiveImpact: decimalToFloat(5, 4), // 0.05%,
//     swapFeeFactorForNegativeImpact: decimalToFloat(7, 4), // 0.07%,

//     negativeSwapImpactFactor: decimalToFloat(1, 5), // 0.001%
//     positiveSwapImpactFactor: decimalToFloat(5, 6), // 0.0005%
//     swapImpactExponentFactor: decimalToFloat(2, 0), // 2

//     minCollateralUsd: decimalToFloat(1, 0), // 1 USD

//     // factor in open interest reserve factor 80%
//     borrowingFactorForLongs: decimalToFloat(625, 11), // 0.00000000625 * 80% = 0.000000005, 0.0000005% / second, 15.77% per year if the pool is 100% utilized
//     borrowingFactorForShorts: decimalToFloat(625, 11), // 0.00000000625 * 80% = 0.000000005, 0.0000005% / second, 15.77% per year if the pool is 100% utilized

//     borrowingExponentFactorForLongs: decimalToFloat(1),
//     borrowingExponentFactorForShorts: decimalToFloat(1),

//     fundingFactor: decimalToFloat(2, 8), // ~63% per year for a 100% skew
//     fundingExponentFactor: decimalToFloat(1),

//     fundingIncreaseFactorPerSecond: 0,
//     fundingDecreaseFactorPerSecond: 0,
//     thresholdForStableFunding: 0,
//     thresholdForDecreaseFunding: 0,
//     minFundingFactorPerSecond: 0,
//     maxFundingFactorPerSecond: 0,

//     positionImpactPoolDistributionRate: 0,
//     minPositionImpactPoolAmount: 0,
// };

// async function configNew(
//     chainId: StarknetChainId,
//     account: AccountInterface,
//     marketTokenAddress: string,
//     longTokenAddress: string,
//     shortTokenAddress: string
// ) {
//     const configData = {
//         ...DEFAULT_CONFIG,

//         // ---------------------------------------------------------------------

//         tokens: { indexToken: "ETH", longToken: "ETH", shortToken: "USDT" },
//         virtualTokenIdForIndexToken: getKey("PERP:ETH/USD"),
//         virtualMarketId: getKey("SPOT:ETH/USD"),

//         // ---------------------------------------------------------------------

//         // maxLongTokenPoolAmount: expandDecimals(26_700, 18),
//         // maxShortTokenPoolAmount: expandDecimals(60_000_000, 6),

//         // maxLongTokenPoolAmountForDeposit: expandDecimals(24_500, 18),
//         // maxShortTokenPoolAmountForDeposit: expandDecimals(55_000_000, 6),

//         negativePositionImpactFactor: decimalToFloat(15, 11), // 0.05% for ~1,600,000 USD of imbalance
//         positivePositionImpactFactor: decimalToFloat(9, 11), // 0.05% for ~2,700,000 USD of imbalance

//         positionImpactPoolDistributionRate: expandDecimals(256, 41), // ~2.21 ETH/day
//         minPositionImpactPoolAmount: expandDecimals(24, 18), // 24 ETH

//         negativeSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance
//         positiveSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance

//         // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
//         minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
//         minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

//         maxOpenInterestForLongs: decimalToFloat(64_000_000),
//         maxOpenInterestForShorts: decimalToFloat(64_000_000),

//         fundingIncreaseFactorPerSecond: decimalToFloat(8, 13), // 0.0000000000008, at least 3.5 hours to reach max funding
//         fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
//         minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
//         maxFundingFactorPerSecond: decimalToFloat(1, 8), // 0.000001%,  0.0036% per hour, 31.5% per year
//         thresholdForStableFunding: decimalToFloat(5, 2), // 5%
//         thresholdForDecreaseFunding: decimalToFloat(0), // 0%

//         borrowingFactorForLongs: decimalToFloat(720, 14), // 7.20e-12, 23.53% at 100% utilisation
//         borrowingFactorForShorts: decimalToFloat(720, 14), // 7.20e-12, 23.53% at 100% utilisation

//         borrowingExponentFactorForLongs: decimalToFloat(14, 1), // 1.4
//         borrowingExponentFactorForShorts: decimalToFloat(14, 1), // 1.4
//     };

//     const dataStoreContract = createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI);
//     const dataStoreAddress = dataStoreContract.address;

//     console.log("Begin config...");

//     // -----------------------------------------------------------------------------------------------------------------

//     // const virtualTokenCalls = [];
//     // const virtualTokenIdForIndexTokenKey = dataStoreKeys.virtualTokenIdKey(
//     //     configData.virtualTokenIdForIndexToken
//     // );
//     // virtualTokenCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_felt252",
//     //     calldata: [virtualTokenIdForIndexTokenKey, configData.virtualTokenIdForIndexToken],
//     // });
//     // const virtualTokenIdForMarketToken = dataStoreKeys.virtualMarketIdKey(
//     //     configData.virtualTokenIdForIndexToken
//     // );
//     // virtualTokenCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_felt252",
//     //     calldata: [virtualTokenIdForMarketToken, configData.virtualMarketId],
//     // });
//     // await executeAndWait(account, virtualTokenCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const minPositionImpactPoolAmountCalls: Call[] = [];
//     // // minPositionImpactPoolAmount
//     // const minPositionImpactPoolAmountKey =
//     //     dataStoreKeys.minPositionImpactPoolAmountKey(marketTokenAddress);
//     // minPositionImpactPoolAmountCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [minPositionImpactPoolAmountKey, configData.minPositionImpactPoolAmount],
//     // });
//     // // await executeAndWait(account, minPositionImpactPoolAmountCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const minPositionImpactPoolAmountRateCalls: Call[] = [];
//     // // positionImpactPoolDistributionRate
//     // const positionImpactPoolDistributionRateKey =
//     //     dataStoreKeys.positionImpactPoolDistributionRateKey(marketTokenAddress);
//     // minPositionImpactPoolAmountRateCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [
//     //         positionImpactPoolDistributionRateKey,
//     //         configData.positionImpactPoolDistributionRate,
//     //         "0",
//     //     ],
//     // });
//     // // await executeAndWait(account, minPositionImpactPoolAmountRateCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const maxTokenPoolAmountCalls: Call[] = [];

//     // maxLongTokenPoolAmount
//     const maxLongTokenPoolAmountKey = dataStoreKeys.maxPoolAmountKey(
//         marketTokenAddress,
//         longTokenAddress
//     );
//     maxTokenPoolAmountCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxLongTokenPoolAmountKey,
//             // configData.maxLongTokenPoolAmount,
//             new CairoUint256(5000000000000000000000000000000000000000000),
//         ])
//     );

//     // maxShortTokenPoolAmount
//     const maxShortTokenPoolAmountKey = dataStoreKeys.maxPoolAmountKey(
//         marketTokenAddress,
//         shortTokenAddress
//     );
//     maxTokenPoolAmountCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxShortTokenPoolAmountKey,
//             // configData.maxShortTokenPoolAmount,
//             new CairoUint256(2500000000000000000000000000000000000000000000),
//         ])
//     );

//     await executeAndWait(account, maxTokenPoolAmountCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const maxPoolAmountForDepositCalls: Call[] = [];
//     // // maxLongTokenPoolAmountForDeposit => maxPoolAmountForDepositKey()
//     // const maxLongTokenPoolAmountForDepositKey = dataStoreKeys.maxPoolAmountForDepositKey(
//     //     marketTokenAddress,
//     //     longTokenAddress
//     // );
//     // maxPoolAmountForDepositCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [
//     //         maxLongTokenPoolAmountForDepositKey,
//     //         configData.maxLongTokenPoolAmountForDeposit,
//     //     ],
//     // });

//     // // maxShortTokenPoolAmountForDeposit => maxPoolAmountForDepositKey()
//     // const maxShortTokenPoolAmountForDepositKey = dataStoreKeys.maxPoolAmountForDepositKey(
//     //     marketTokenAddress,
//     //     shortTokenAddress
//     // );
//     // maxPoolAmountForDepositCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [
//     //         maxShortTokenPoolAmountForDepositKey,
//     //         configData.maxShortTokenPoolAmountForDeposit,
//     //     ],
//     // });
//     // await executeAndWait(account, maxPoolAmountForDepositCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const positionImpactFactorCalls: Call[] = [];
//     // negativePositionImpactFactor
//     const negativePositionImpactFactorKey = dataStoreKeys.positionImpactFactorKey(
//         marketTokenAddress,
//         false
//     );
//     positionImpactFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             negativePositionImpactFactorKey,
//             configData.negativePositionImpactFactor,
//         ])
//     );

//     // positivePositionImpactFactor
//     const positivePositionImpactFactorKey = dataStoreKeys.positionImpactFactorKey(
//         marketTokenAddress,
//         false
//     );
//     positionImpactFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             positivePositionImpactFactorKey,
//             configData.positivePositionImpactFactor,
//         ])
//     );
//     await executeAndWait(account, positionImpactFactorCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const minCollateralFactorForOpenInterestMultiplierCalls: Call[] = [];
//     // minCollateralFactorForOpenInterestMultiplierLong
//     const minCollateralFactorForOpenInterestMultiplierLongKey =
//         dataStoreKeys.minCollateralFactorForOpenInterest(marketTokenAddress, true);
//     minCollateralFactorForOpenInterestMultiplierCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             minCollateralFactorForOpenInterestMultiplierLongKey,
//             configData.minCollateralFactorForOpenInterestMultiplierLong,
//         ])
//     );

//     // minCollateralFactorForOpenInterestMultiplierShort
//     const minCollateralFactorForOpenInterestMultiplierShortKey =
//         dataStoreKeys.minCollateralFactorForOpenInterest(marketTokenAddress, false);
//     minCollateralFactorForOpenInterestMultiplierCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             minCollateralFactorForOpenInterestMultiplierShortKey,
//             configData.minCollateralFactorForOpenInterestMultiplierShort,
//         ])
//     );
//     await executeAndWait(account, minCollateralFactorForOpenInterestMultiplierCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const swapImpactFactorCalls = [];

//     // negativeSwapImpactFactor
//     const negativeSwapImpactFactorKey = dataStoreKeys.swapImpactFactorKey(
//         marketTokenAddress,
//         false
//     );
//     swapImpactFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             negativeSwapImpactFactorKey,
//             configData.negativeSwapImpactFactor,
//         ])
//     );

//     // positiveSwapImpactFactor
//     const positiveSwapImpactFactorKey = dataStoreKeys.swapImpactFactorKey(marketTokenAddress, true);
//     swapImpactFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             positiveSwapImpactFactorKey,
//             configData.positiveSwapImpactFactor,
//         ])
//     );
//     await executeAndWait(account, swapImpactFactorCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const maxOpenInterestCalls = [];

//     // maxOpenInterestForLongs
//     const maxOpenInterestForLongsKey = dataStoreKeys.maxOpenInterestKey(marketTokenAddress, true);
//     maxOpenInterestCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxOpenInterestForLongsKey,
//             configData.maxOpenInterestForLongs,
//         ])
//     );

//     // maxOpenInterestForShorts
//     const maxOpenInterestForShortsKey = dataStoreKeys.maxOpenInterestKey(marketTokenAddress, false);
//     maxOpenInterestCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxOpenInterestForShortsKey,
//             configData.maxOpenInterestForShorts,
//         ])
//     );
//     await executeAndWait(account, maxOpenInterestCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const fundingIncreaseFactorPerSecondCalls = [];
//     // // fundingIncreaseFactorPerSecond
//     // const fundingIncreaseFactorPerSecondKey =
//     //     dataStoreKeys.fundingIncreaseFactorPerSecondKey(marketTokenAddress);
//     // fundingIncreaseFactorPerSecondCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [
//     //         fundingIncreaseFactorPerSecondKey,
//     //         configData.fundingIncreaseFactorPerSecond,
//     //         "0",
//     //     ],
//     // });

//     // // fundingDecreaseFactorPerSecond
//     // const fundingDecreaseFactorPerSecondKey =
//     //     dataStoreKeys.fundingDecreaseFactorPerSecondKey(marketTokenAddress);
//     // fundingIncreaseFactorPerSecondCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [
//     //         fundingDecreaseFactorPerSecondKey,
//     //         configData.fundingDecreaseFactorPerSecond,
//     //         "0",
//     //     ],
//     // });
//     // await executeAndWait(account, fundingIncreaseFactorPerSecondCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const minFundingFactorPerSecondCalls = [];

//     // // minFundingFactorPerSecond
//     // const minFundingFactorPerSecondKey =
//     //     dataStoreKeys.minFundingFactorPerSecondKey(marketTokenAddress);
//     // minFundingFactorPerSecondCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [minFundingFactorPerSecondKey, configData.minFundingFactorPerSecond],
//     // });
//     // await executeAndWait(account, minFundingFactorPerSecondCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const maxFundingFactorPerSecondCalls = [];

//     // // maxFundingFactorPerSecond
//     // const maxFundingFactorPerSecondKey =
//     //     dataStoreKeys.maxFundingFactorPerSecondKey(marketTokenAddress);
//     // maxFundingFactorPerSecondCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [maxFundingFactorPerSecondKey, configData.maxFundingFactorPerSecond],
//     // });
//     // await executeAndWait(account, maxFundingFactorPerSecondCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const thresholdForStableFundingCalls = [];

//     // // thresholdForStableFunding
//     // const thresholdForStableFundingKey =
//     //     dataStoreKeys.thresholdForStableFundingKey(marketTokenAddress);
//     // thresholdForStableFundingCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [thresholdForStableFundingKey, configData.thresholdForStableFunding],
//     // });
//     // await executeAndWait(account, thresholdForStableFundingCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const thresholdForDecreaseFundingCalls = [];

//     // // thresholdForDecreaseFunding
//     // const thresholdForDecreaseFundingKey =
//     //     dataStoreKeys.thresholdForDecreaseFundingKey(marketTokenAddress);
//     // thresholdForDecreaseFundingCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [thresholdForDecreaseFundingKey, configData.thresholdForDecreaseFunding],
//     // });
//     // await executeAndWait(account, thresholdForDecreaseFundingCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const borrowingFactorCalls = [];

//     // borrowingFactorForLongs
//     const borrowingFactorForLongsKey = dataStoreKeys.borrowingFactorKey(marketTokenAddress, true);
//     borrowingFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             borrowingFactorForLongsKey,
//             configData.borrowingFactorForLongs,
//         ])
//     );

//     // borrowingFactorForShorts
//     const borrowingFactorForShortsKey = dataStoreKeys.borrowingFactorKey(marketTokenAddress, false);
//     borrowingFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             borrowingFactorForShortsKey,
//             configData.borrowingFactorForShorts,
//         ])
//     );
//     await executeAndWait(account, borrowingFactorCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const borrowingExponentFactorCalls = [];

//     // borrowingExponentFactorForLongs
//     const borrowingExponentFactorForLongsKey = dataStoreKeys.borrowingExponentFactorKey(
//         marketTokenAddress,
//         true
//     );
//     borrowingExponentFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             borrowingExponentFactorForLongsKey,
//             configData.borrowingExponentFactorForLongs,
//         ])
//     );

//     // borrowingExponentFactorForShorts
//     const borrowingExponentFactorForShortsKey = dataStoreKeys.borrowingExponentFactorKey(
//         marketTokenAddress,
//         false
//     );
//     borrowingExponentFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             borrowingExponentFactorForShortsKey,
//             configData.borrowingExponentFactorForShorts,
//         ])
//     );
//     await executeAndWait(account, borrowingExponentFactorCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const reserveFactorCalls = [];

//     // reserveFactorLongs
//     const reserveFactorLongsKey = dataStoreKeys.reserveFactorKey(marketTokenAddress, true);
//     reserveFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             reserveFactorLongsKey,
//             // configData.reserveFactorLongs,
//             new CairoUint256(1000000000000000000),
//         ])
//     );

//     // reserveFactorShorts
//     const reserveFactorShortsKey = dataStoreKeys.reserveFactorKey(marketTokenAddress, false);
//     reserveFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             reserveFactorShortsKey,
//             // configData.reserveFactorShorts,
//             new CairoUint256(1000000000000000000),
//         ])
//     );
//     await executeAndWait(account, reserveFactorCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const openInterestReserveFactorCalls = [];

//     // openInterestReserveFactorLongs
//     const openInterestReserveFactorLongsKey = dataStoreKeys.openInterestReserveFactorKey(
//         marketTokenAddress,
//         true
//     );
//     openInterestReserveFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             openInterestReserveFactorLongsKey,
//             // configData.openInterestReserveFactorLongs,
//             new CairoUint256(1000000000000000000),
//         ])
//     );

//     // openInterestReserveFactorShorts
//     const openInterestReserveFactorShortsKey = dataStoreKeys.openInterestReserveFactorKey(
//         marketTokenAddress,
//         false
//     );
//     openInterestReserveFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             openInterestReserveFactorShortsKey,
//             // configData.openInterestReserveFactorShorts,
//             new CairoUint256(1000000000000000000),
//         ])
//     );
//     await executeAndWait(account, openInterestReserveFactorCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const maxPnlFactorForTradersCalls = [];

//     // maxPnlFactorForTradersLongs
//     const maxPnlFactorForTradersLongsKey = dataStoreKeys.maxPnlFactorKey(
//         dataStoreKeys.MAX_PNL_FACTOR_FOR_TRADERS_KEY,
//         marketTokenAddress,
//         true
//     );
//     maxPnlFactorForTradersCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxPnlFactorForTradersLongsKey,
//             configData.maxPnlFactorForTradersLongs,
//         ])
//     );

//     // maxPnlFactorForTradersShorts
//     const maxPnlFactorForTradersShortsKey = dataStoreKeys.maxPnlFactorKey(
//         dataStoreKeys.MAX_PNL_FACTOR_FOR_TRADERS_KEY,
//         marketTokenAddress,
//         false
//     );
//     maxPnlFactorForTradersCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxPnlFactorForTradersShortsKey,
//             configData.maxPnlFactorForTradersShorts,
//         ])
//     );
//     await executeAndWait(account, maxPnlFactorForTradersCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const maxPnlFactorForAdlCalls = [];

//     // // maxPnlFactorForAdlLongs
//     // const maxPnlFactorForAdlLongsKey = dataStoreKeys.maxPnlFactorKey(
//     //     dataStoreKeys.MAX_PNL_FACTOR_FOR_ADL,
//     //     marketTokenAddress,
//     //     true
//     // );
//     // maxPnlFactorForAdlCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [maxPnlFactorForAdlLongsKey, configData.maxPnlFactorForAdlLongs],
//     // });

//     // // maxPnlFactorForAdlShorts
//     // const maxPnlFactorForAdlShortsKey = dataStoreKeys.maxPnlFactorKey(
//     //     dataStoreKeys.MAX_PNL_FACTOR_FOR_ADL,
//     //     marketTokenAddress,
//     //     false
//     // );
//     // maxPnlFactorForAdlCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [maxPnlFactorForAdlShortsKey, configData.maxPnlFactorForAdlShorts],
//     // });
//     // await executeAndWait(account, maxPnlFactorForAdlCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const minPnlFactorAfterAdlCalls = [];

//     // // minPnlFactorAfterAdlLongs
//     // const minPnlFactorAfterAdlLongsKey = dataStoreKeys.minPnlFactorAfterAdl(
//     //     marketTokenAddress,
//     //     true
//     // );
//     // minPnlFactorAfterAdlCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [minPnlFactorAfterAdlLongsKey, configData.minPnlFactorAfterAdlLongs],
//     // });

//     // // minPnlFactorAfterAdlShorts
//     // const minPnlFactorAfterAdlShortsKey = dataStoreKeys.minPnlFactorAfterAdl(
//     //     marketTokenAddress,
//     //     false
//     // );
//     // minPnlFactorAfterAdlCalls.push({
//     //     contractAddress: dataStoreAddress,
//     //     entrypoint: "set_u256",
//     //     calldata: [minPnlFactorAfterAdlShortsKey, configData.minPnlFactorAfterAdlShorts],
//     // });
//     // await executeAndWait(account, minPnlFactorAfterAdlCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const maxPnlFactorForDepositsCalls = [];

//     // maxPnlFactorForDepositsLongs
//     const maxPnlFactorForDepositsLongsKey = dataStoreKeys.maxPnlFactorKey(
//         dataStoreKeys.MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
//         marketTokenAddress,
//         true
//     );
//     maxPnlFactorForDepositsCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxPnlFactorForDepositsLongsKey,
//             // configData.maxPnlFactorForDepositsLongs,
//             new CairoUint256(50000000000000000000000000000000000000000000000),
//         ])
//     );

//     // maxPnlFactorForDepositsShorts
//     const maxPnlFactorForDepositsShortsKey = dataStoreKeys.maxPnlFactorKey(
//         dataStoreKeys.MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
//         marketTokenAddress,
//         false
//     );
//     maxPnlFactorForDepositsCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxPnlFactorForDepositsShortsKey,
//             // configData.maxPnlFactorForDepositsShorts,
//             new CairoUint256(50000000000000000000000000000000000000000000000),
//         ])
//     );
//     await executeAndWait(account, maxPnlFactorForDepositsCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const maxPnlFactorForWithdrawalsCalls = [];

//     // maxPnlFactorForWithdrawalsLongs
//     const maxPnlFactorForWithdrawalsLongsKey = dataStoreKeys.maxPnlFactorKey(
//         dataStoreKeys.MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
//         marketTokenAddress,
//         true
//     );
//     maxPnlFactorForWithdrawalsCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxPnlFactorForWithdrawalsLongsKey,
//             // configData.maxPnlFactorForWithdrawalsLongs,
//             new CairoUint256(50000000000000000000000000000000000000000000000),
//         ])
//     );

//     // maxPnlFactorForWithdrawalsShorts
//     const maxPnlFactorForWithdrawalsShortsKey = dataStoreKeys.maxPnlFactorKey(
//         dataStoreKeys.MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
//         marketTokenAddress,
//         false
//     );
//     maxPnlFactorForWithdrawalsCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxPnlFactorForWithdrawalsShortsKey,
//             // configData.maxPnlFactorForWithdrawalsShorts,
//             new CairoUint256(50000000000000000000000000000000000000000000000),
//         ])
//     );
//     await executeAndWait(account, maxPnlFactorForWithdrawalsCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const maxPositionImpactFactorCalls = [];

//     // positiveMaxPositionImpactFactor
//     const positiveMaxPositionImpactFactorKey = dataStoreKeys.maxPositionImpactFactorKey(
//         marketTokenAddress,
//         true
//     );
//     maxPositionImpactFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             positiveMaxPositionImpactFactorKey,
//             configData.positiveMaxPositionImpactFactor,
//         ])
//     );

//     // negativeMaxPositionImpactFactor
//     const negativeMaxPositionImpactFactorKey = dataStoreKeys.maxPositionImpactFactorKey(
//         marketTokenAddress,
//         false
//     );
//     maxPositionImpactFactorCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             negativeMaxPositionImpactFactorKey,
//             configData.negativeMaxPositionImpactFactor,
//         ])
//     );
//     await executeAndWait(account, maxPositionImpactFactorCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     const maxPositionImpactFactorForLiquidationsCalls = [];

//     // maxPositionImpactFactorForLiquidations
//     const maxPositionImpactFactorForLiquidationsKey =
//         dataStoreKeys.maxPositionImpactFactorForLiquidationsKey(marketTokenAddress);
//     maxPositionImpactFactorForLiquidationsCalls.push(
//         createCall(dataStoreContract, "set_u256", [
//             maxPositionImpactFactorForLiquidationsKey,
//             configData.maxPositionImpactFactorForLiquidations,
//         ])
//     );
//     await executeAndWait(account, maxPositionImpactFactorForLiquidationsCalls);

//     // -----------------------------------------------------------------------------------------------------------------

//     // const smaller_set_u256s = chunk(set_u256s, 4);
//     // await Promise.all(smaller_set_u256s.map(async (arr, index) => {
//     //    console.log("🚀 ~ awaitPromise.all ~ index:", index)
//     //    await sleep(5000);
//     //    await executeAndWait("set_u256: " + index, arr);
//     // }))

//     // -----------------------------------------------------------------------------------------------------------------

//     console.log("All config done.");
// }
