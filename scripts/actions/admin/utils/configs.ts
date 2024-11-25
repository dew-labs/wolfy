import { expandDecimals } from "packages/shared/src/utils";

import { decimalToFloat } from "packages/shared/src/utils";

// Default (index token is the same as the long token): BTC[WBTC.e/USDC], ETH[WETH/USDC], SOL[SOL/USDC], UNI[UNI/USDC], LINK[LINK/USDC], ARB[ARB/USDC]
// Synthetic (index token is different from the long token): XRP[WETH/USDC], DOGE[WETH/USDC], LTC[WETH/USDC],
// Stablecoin (between 2 stablecoins): [USDC/USDT], [USDC/DAI]

export const DEFAULT_CONFIG = {
    isSwapOnly: false,

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

    borrowingFactorForLongs: decimalToFloat(5, 9), // 0.000000003, 0.0000003% / second, 15.77% per year if the pool is 100% utilized
    borrowingFactorForShorts: decimalToFloat(5, 9), // 0.000000003, 0.0000003% / second, 15.77% per year if the pool is 100% utilized

    borrowingExponentFactorForLongs: decimalToFloat(1),
    borrowingExponentFactorForShorts: decimalToFloat(1),

    fundingFactor: decimalToFloat(2, 8), // ~63% per year for a 100% skew
    fundingExponentFactor: decimalToFloat(1),
};

export const SYNTHETIC_MARKET_CONFIG = {
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

export const STABLECOIN_SWAPMARKET_CONFIG = {
    swapOnly: true,

    swapFeeFactorForPositiveImpact: decimalToFloat(1, 4), // 0.01%,
    swapFeeFactorForNegativeImpact: decimalToFloat(1, 4), // 0.01%,

    negativeSwapImpactFactor: decimalToFloat(5, 10), // 0.01% for 200,000 USD of imbalance
    positiveSwapImpactFactor: decimalToFloat(5, 10), // 0.01% for 200,000 USD of imbalance
};
