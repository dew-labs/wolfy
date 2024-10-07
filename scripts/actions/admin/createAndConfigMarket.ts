import { getTokens, settingUp } from "@freyr/shared/utils";
import configMarket from "./utils/configMarket";
import createMarket from "./utils/createMarket";

const tokens = getTokens();

// NOTE: Should update based on tokens.<net>.json
const TOKENS = {
    wfUSD: tokens.find((token) => token.symbol === "wfUSD")!,
    DUSD: tokens.find((token) => token.symbol === "DUSD")!,
    wfETH: tokens.find((token) => token.symbol === "wfETH")!,
    wfSTRK: tokens.find((token) => token.symbol === "wfSTRK")!,
    wfBTC: tokens.find((token) => token.symbol === "wfBTC")!,
};

for (const token of Object.values(TOKENS)) {
    if (!token) {
        throw new Error(`Token not found: ${token}`);
    }
}

const MARKETS_TO_DEPLOY = [
    // ETH/USD (wfETH/wfUSD)
    {
        marketName: "ETH/USD",
        indexTokenAddress: TOKENS.wfETH.address,
        longTokenAddress: TOKENS.wfETH.address,
        shortTokenAddress: TOKENS.wfUSD.address,
        maxLongTokenPoolAmount: 5000, // 5000 ETH
        maxShortTokenPoolAmount: 10000000, // 10,000,000 wfUSD
    },
    // ETH/USD (wfETH/DUSD)
    {
        marketName: "ETH/USD",
        indexTokenAddress: TOKENS.wfETH.address,
        longTokenAddress: TOKENS.wfETH.address,
        shortTokenAddress: TOKENS.DUSD.address,
        maxLongTokenPoolAmount: 5000, // 5000 ETH
        maxShortTokenPoolAmount: 10000000, // 10,000,000 DUSD
    },
    // STRK/USD (wfSTRK/wfUSD)
    {
        marketName: "STRK/USD",
        indexTokenAddress: TOKENS.wfSTRK.address,
        longTokenAddress: TOKENS.wfSTRK.address,
        shortTokenAddress: TOKENS.wfUSD.address,
        maxLongTokenPoolAmount: 24000000, // 24,000,000 wfSTRK
        maxShortTokenPoolAmount: 10000000, // 10,000,000 wfUSD
    },
    // STRK/USD (wfSTRK/DUSD)
    {
        marketName: "STRK/USD",
        indexTokenAddress: TOKENS.wfSTRK.address,
        longTokenAddress: TOKENS.wfSTRK.address,
        shortTokenAddress: TOKENS.DUSD.address,
        maxLongTokenPoolAmount: 24000000, // 24,000,000 wfSTRK
        maxShortTokenPoolAmount: 10000000, // 10,000,000 DUSD
    },
    // BTC/USD (wfBTC/wfUSD)
    {
        marketName: "BTC/USD",
        indexTokenAddress: TOKENS.wfBTC.address,
        longTokenAddress: TOKENS.wfBTC.address,
        shortTokenAddress: TOKENS.wfUSD.address,
        maxLongTokenPoolAmount: 160, // 160 wfBTC
        maxShortTokenPoolAmount: 10000000, // 10,000,000 wfUSD
    },
    // BTC/USD (wfBTC/DUSD)
    {
        marketName: "BTC/USD",
        indexTokenAddress: TOKENS.wfBTC.address,
        longTokenAddress: TOKENS.wfBTC.address,
        shortTokenAddress: TOKENS.DUSD.address,
        maxLongTokenPoolAmount: 160, // 160 wfBTC
        maxShortTokenPoolAmount: 10000000, // 10,000,000 DUSD,
    },
];

async function createMarketWithReusedTokens() {
    const { chainId, account } = await settingUp();

    for (const market of MARKETS_TO_DEPLOY) {
        const marketToken = await createMarket(
            account,
            market.indexTokenAddress,
            market.longTokenAddress,
            market.shortTokenAddress
        );

        await configMarket(
            chainId,
            account,
            market.marketName,
            marketToken,
            market.maxLongTokenPoolAmount,
            market.maxShortTokenPoolAmount
        );
    }
}

createMarketWithReusedTokens();
