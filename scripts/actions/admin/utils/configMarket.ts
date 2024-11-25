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
import { DEFAULT_CONFIG } from "./configs";
import { GENERAL_CONFIGS } from "scripts/deploy";

export default async function configMarket(
    chainId: StarknetChainId,
    account: Account,
    marketName: string,
    marketToken: string,
    maxLongTokenPoolAmount: number | bigint,
    maxShortTokenPoolAmount: number | bigint,
    isSwapOnly?: boolean
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
        ...DEFAULT_CONFIG,

        virtualTokenIdForIndexToken: 0n,
        virtualMarketId: 0n,

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

    if (!isSwapOnly) {
        // virtual token id for perps
        configData.virtualTokenIdForIndexToken = poseidonHash(`PERP:${marketName}`);
        // virtual market id for swaps
        configData.virtualMarketId = poseidonHash(`SPOT:${marketName}`);
    } else {
        configData.isSwapOnly = true;
    }

    console.log("Begin config...");

    const calls: Call[] = [];

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

    // swapFeeFactorForPositiveImpact
    const swapFeeFactorForPositiveImpactKey = dataStoreKeys.swapFeeFactorKey(
        marketTokenAddress,
        true
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            swapFeeFactorForPositiveImpactKey,
            configData.swapFeeFactorForPositiveImpact,
        ])
    );

    // swapFeeFactorForNegativeImpact
    const swapFeeFactorForNegativeImpactKey = dataStoreKeys.swapFeeFactorKey(
        marketTokenAddress,
        false
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            swapFeeFactorForNegativeImpactKey,
            configData.swapFeeFactorForNegativeImpact,
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------

    // negativeSwapImpactFactor
    const negativeSwapImpactFactorKey = dataStoreKeys.swapImpactFactorKey(
        marketTokenAddress,
        false
    );
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            negativeSwapImpactFactorKey,
            configData.negativeSwapImpactFactor,
        ])
    );

    // positiveSwapImpactFactor
    const positiveSwapImpactFactorKey = dataStoreKeys.swapImpactFactorKey(marketTokenAddress, true);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            positiveSwapImpactFactorKey,
            configData.positiveSwapImpactFactor,
        ])
    );

    // swapImpactExponentFactor
    const swapImpactExponentFactorKey =
        dataStoreKeys.swapImpactExponentFactorKey(marketTokenAddress);
    calls.push(
        createCall(dataStoreContract, "set_u256", [
            swapImpactExponentFactorKey,
            configData.swapImpactExponentFactor,
        ])
    );

    // -----------------------------------------------------------------------------------------------------------------
    // Not fot swapOnly markets

    if (!isSwapOnly) {
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
        const maxOpenInterestForLongsKey = dataStoreKeys.maxOpenInterestKey(
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                maxOpenInterestForLongsKey,
                configData.maxOpenInterestForLongs,
            ])
        );

        // maxOpenInterestForShorts
        const maxOpenInterestForShortsKey = dataStoreKeys.maxOpenInterestKey(
            marketTokenAddress,
            false
        );
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

        // borrowingFactorForLongs
        const borrowingFactorForLongsKey = dataStoreKeys.borrowingFactorKey(
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                borrowingFactorForLongsKey,
                configData.borrowingFactorForLongs,
            ])
        );

        // borrowingFactorForShorts
        const borrowingFactorForShortsKey = dataStoreKeys.borrowingFactorKey(
            marketTokenAddress,
            false
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                borrowingFactorForShortsKey,
                configData.borrowingFactorForShorts,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // borrowingExponentFactorForLongs
        const borrowingExponentFactorForLongsKey = dataStoreKeys.borrowingExponentFactorKey(
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                borrowingExponentFactorForLongsKey,
                configData.borrowingExponentFactorForLongs,
            ])
        );

        // borrowingExponentFactorForShorts
        const borrowingExponentFactorForShortsKey = dataStoreKeys.borrowingExponentFactorKey(
            marketTokenAddress,
            false
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                borrowingExponentFactorForShortsKey,
                configData.borrowingExponentFactorForShorts,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // maxPnlFactorForTradersLongs
        const maxPnlFactorForTradersLongsKey = dataStoreKeys.maxPnlFactorKey(
            dataStoreKeys.MAX_PNL_FACTOR_FOR_TRADERS,
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                maxPnlFactorForTradersLongsKey,
                configData.maxPnlFactorForTradersLongs,
            ])
        );

        // maxPnlFactorForTradersShorts
        const maxPnlFactorForTradersShortsKey = dataStoreKeys.maxPnlFactorKey(
            dataStoreKeys.MAX_PNL_FACTOR_FOR_TRADERS,
            marketTokenAddress,
            false
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                maxPnlFactorForTradersShortsKey,
                configData.maxPnlFactorForTradersShorts,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // maxPnlFactorForAdlLongs
        const maxPnlFactorForAdlLongsKey = dataStoreKeys.maxPnlFactorKey(
            dataStoreKeys.MAX_PNL_FACTOR_FOR_ADL,
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                maxPnlFactorForAdlLongsKey,
                configData.maxPnlFactorForAdlLongs,
            ])
        );

        // maxPnlFactorForAdlShorts
        const maxPnlFactorForAdlShortsKey = dataStoreKeys.maxPnlFactorKey(
            dataStoreKeys.MAX_PNL_FACTOR_FOR_ADL,
            marketTokenAddress,
            false
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                maxPnlFactorForAdlShortsKey,
                configData.maxPnlFactorForAdlShorts,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // minPnlFactorAfterAdlLongs
        const minPnlFactorAfterAdlLongsKey = dataStoreKeys.minPnlFactorAfterAdlKey(
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                minPnlFactorAfterAdlLongsKey,
                configData.minPnlFactorAfterAdlLongs,
            ])
        );

        // minPnlFactorAfterAdlShorts
        const minPnlFactorAfterAdlShortsKey = dataStoreKeys.minPnlFactorAfterAdlKey(
            marketTokenAddress,
            false
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                minPnlFactorAfterAdlShortsKey,
                configData.minPnlFactorAfterAdlShorts,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // Insufficient collateral usd
        // minCollateralFactorForOpenInterestMultiplierLong
        const minCollateralFactorForOpenInterestMultiplierLongKey =
            dataStoreKeys.minCollateralFactorForOpenInterestMultiplierKey(marketTokenAddress, true);
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                minCollateralFactorForOpenInterestMultiplierLongKey,
                configData.minCollateralFactorForOpenInterestMultiplierLong,
            ])
        );

        // minCollateralFactorForOpenInterestMultiplierShort
        const minCollateralFactorForOpenInterestMultiplierShortKey =
            dataStoreKeys.minCollateralFactorForOpenInterestMultiplierKey(
                marketTokenAddress,
                false
            );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                minCollateralFactorForOpenInterestMultiplierShortKey,
                configData.minCollateralFactorForOpenInterestMultiplierShort,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // Price impact larger order size
        // positivePositionImpactFactor
        const positivePositionImpactFactorKey = dataStoreKeys.positionImpactFactorKey(
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                positivePositionImpactFactorKey,
                configData.positivePositionImpactFactor,
            ])
        );

        // negativePositionImpactFactor
        const negativePositionImpactFactorKey = dataStoreKeys.positionImpactFactorKey(
            marketTokenAddress,
            false
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                negativePositionImpactFactorKey,
                configData.negativePositionImpactFactor,
            ])
        );

        // positionImpactExponentFactor
        const positionImpactExponentFactorKey =
            dataStoreKeys.positionImpactExponentFactorKey(marketTokenAddress);
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                positionImpactExponentFactorKey,
                configData.positionImpactExponentFactor,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // positiveMaxPositionImpactFactor
        const positiveMaxPositionImpactFactorKey = dataStoreKeys.maxPositionImpactFactorKey(
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                positiveMaxPositionImpactFactorKey,
                configData.positiveMaxPositionImpactFactor,
            ])
        );

        // negativeMaxPositionImpactFactor
        const negativeMaxPositionImpactFactorKey = dataStoreKeys.maxPositionImpactFactorKey(
            marketTokenAddress,
            false
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                negativeMaxPositionImpactFactorKey,
                configData.negativeMaxPositionImpactFactor,
            ])
        );

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

        // minCollateralFactor
        const minCollateralFactorKey = dataStoreKeys.minCollateralFactorKey(marketTokenAddress);
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                minCollateralFactorKey,
                configData.minCollateralFactor,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // positionFeeFactorForPositiveImpact
        const positionFeeFactorForPositiveImpactKey = dataStoreKeys.positionFeeFactorKey(
            marketTokenAddress,
            true
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                positionFeeFactorForPositiveImpactKey,
                configData.positionFeeFactorForPositiveImpact,
            ])
        );

        // positionFeeFactorForNegativeImpact
        const positionFeeFactorForNegativeImpactKey = dataStoreKeys.positionFeeFactorKey(
            marketTokenAddress,
            false
        );
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                positionFeeFactorForNegativeImpactKey,
                configData.positionFeeFactorForNegativeImpact,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        // fundingFactor
        const fundingFactorKey = dataStoreKeys.fundingFactorKey(marketTokenAddress);
        calls.push(
            createCall(dataStoreContract, "set_u256", [fundingFactorKey, configData.fundingFactor])
        );

        // fundingExponentFactor
        const fundingExponentFactorKey = dataStoreKeys.fundingExponentFactorKey(marketTokenAddress);
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                fundingExponentFactorKey,
                configData.fundingExponentFactor,
            ])
        );

        // -----------------------------------------------------------------------------------------------------------------

        const virtualTokenIdForIndexTokenKey = dataStoreKeys.virtualTokenIdKey(marketTokenAddress);
        calls.push({
            contractAddress: dataStoreContract.address,
            entrypoint: "set_felt252",
            calldata: [virtualTokenIdForIndexTokenKey, configData.virtualTokenIdForIndexToken],
        });
        const virtualTokenIdForMarketToken = dataStoreKeys.virtualMarketIdKey(marketTokenAddress);
        calls.push({
            contractAddress: dataStoreContract.address,
            entrypoint: "set_felt252",
            calldata: [virtualTokenIdForMarketToken, configData.virtualMarketId],
        });

        // -----------------------------------------------------------------------------------------------------------------

        // tokenTransferGasLimit
        const tokenTransferGasLimitKey = dataStoreKeys.tokenTransferGasLimit(marketTokenAddress);
        calls.push(
            createCall(dataStoreContract, "set_u256", [
                tokenTransferGasLimitKey,
                GENERAL_CONFIGS.tokenTransferGasLimit,
            ])
        );
        // -----------------------------------------------------------------------------------------------------------------
    }

    // -----------------------------------------------------------------------------------------------------------------

    await executeAndWait(account, calls);

    console.log("All config done.");
}
