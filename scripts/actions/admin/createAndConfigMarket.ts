import { settingUp } from "@/shared/utils/utils";
import configMarket from "./utils/configMarket";
import createMarket from "./utils/createMarket";

// NOTE: Should update based on tokens.<net>.json
const TOKENS = {
    wfUSD: "0x0585593986c67a9802555dab7c7728270b603da6721ed6f754063eb8fd51f0aa",
    DUSD: "0x07d2da5ff2548727ecdc1c2ec8c9c3b552cbe7a9800abc1f69579e75c01b90a5",
    wfETH: "0x0161304979f98530f4c3d6659e0a43cad96ceb71531482c7aaba90e07f150315",
    wfSTRK: "0x0257f31f11fa095874ded95a8ad6c8dca9fb851557df83e7cd384bde65c4d1c4",
    wfBTC: "0x07e3b6dce9c3b052e96a63d63f26aa129a1c5342343a7bb9a20754812bf4e614",
};

const MARKETS_TO_DEPLOY = [
    // ETH/USD (wfETH/wfUSD)
    {
        marketName: "ETH/USD",
        indexTokenAddress: TOKENS.wfETH,
        longTokenAddress: TOKENS.wfETH,
        shortTokenAddress: TOKENS.wfUSD,
        maxLongTokenPoolAmount: 5000,
        maxShortTokenPoolAmount: 10000000,
    },
    // // ETH/USD (wfETH/DUSD)
    // {
    //     marketName: "ETH/USD",
    //     indexTokenAddress: TOKENS.wfETH,
    //     longTokenAddress: TOKENS.wfETH,
    //     shortTokenAddress: TOKENS.DUSD,
    //     maxLongTokenPoolAmount: 5000,
    //     maxShortTokenPoolAmount: 10000000,
    // },
    // // STRK/USD (wfSTRK/wfUSD)
    // {
    //     marketName: "STRK/USD",
    //     indexTokenAddress: TOKENS.wfSTRK,
    //     longTokenAddress: TOKENS.wfSTRK,
    //     shortTokenAddress: TOKENS.wfUSD,
    //     maxLongTokenPoolAmount: 24000000,
    //     maxShortTokenPoolAmount: 10000000,
    // },
    // // STRK/USD (wfSTRK/DUSD)
    // {
    //     marketName: "STRK/USD",
    //     indexTokenAddress: TOKENS.wfSTRK,
    //     longTokenAddress: TOKENS.wfSTRK,
    //     shortTokenAddress: TOKENS.DUSD,
    //     maxLongTokenPoolAmount: 24000000,
    //     maxShortTokenPoolAmount: 10000000,
    // },
    // // BTC/USD (wfBTC/wfUSD)
    // {
    //     marketName: "BTC/USD",
    //     indexTokenAddress: TOKENS.wfBTC,
    //     longTokenAddress: TOKENS.wfBTC,
    //     shortTokenAddress: TOKENS.wfUSD,
    //     maxLongTokenPoolAmount: 160,
    //     maxShortTokenPoolAmount: 10000000,
    // },
    // // BTC/USD (wfBTC/DUSD)
    // {
    //     marketName: "BTC/USD",
    //     indexTokenAddress: TOKENS.wfBTC,
    //     longTokenAddress: TOKENS.wfBTC,
    //     shortTokenAddress: TOKENS.DUSD,
    //     maxLongTokenPoolAmount: 160,
    //     maxShortTokenPoolAmount: 10000000,
    // },
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
