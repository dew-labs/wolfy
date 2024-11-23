import { settingUp } from "packages/shared/src/utils";
import deployToken from "../utils/deployToken";

export const TOKENS_TO_DEPLOY = [
    {
        name: "Wolfy USD",
        symbol: "wfUSD",
        decimals: 18,
        pythPriceId: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
        initialSupply: 1000000n,
    },
    {
        name: "Dew USD",
        symbol: "DUSD",
        decimals: 18,
        pythPriceId: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
        initialSupply: 1000000n,
    },
    {
        name: "Wolfy Ethereum",
        symbol: "wfETH",
        decimals: 18,
        pythPriceId: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
        initialSupply: 10n,
    },
    {
        name: "Wolfy Starknet",
        symbol: "wfSTRK",
        decimals: 18,
        pythPriceId: "0x6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870",
        initialSupply: 10000000n,
    },
    {
        name: "Wolfy Bitcoin",
        symbol: "wfBTC",
        decimals: 8,
        pythPriceId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        initialSupply: 10n,
    },
];

async function deployTokens() {
    const { account, net } = await settingUp();

    for (const token of TOKENS_TO_DEPLOY) {
        await deployToken(
            net,
            account,
            token.name,
            token.symbol,
            token.decimals,
            token.initialSupply,
            token.pythPriceId
        );
    }
}

deployTokens();
