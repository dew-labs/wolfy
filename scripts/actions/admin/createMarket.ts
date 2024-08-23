import { CairoUint256, type Account } from "starknet";
import { ensureDeployed, settingUp } from "../../utils";

import fs from "node:fs";
import { StarknetChainId } from "satoru-sdk";

import {
    createCall,
    createSatoruContract,
    createTokenContract,
    executeAndWait,
    MarketFactoryABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";

async function deployToken(
    net: string,
    account: Account,
    name: string,
    symbol: string,
    decimals = 18,
    initialSupply = 1000000n
) {
    const token = await ensureDeployed(account, undefined, "ERC20", {
        name: name,
        symbol: symbol,
        decimals: decimals,
        initial_supply: initialSupply,
        recipient: account.address,
    });

    let tokens = [];

    try {
        tokens = JSON.parse(fs.readFileSync(`./tokens.${net}.json`).toString("ascii"));
    } catch {}

    if (!Array.isArray(tokens)) tokens = [];

    tokens.push({
        address: toStarknetHexString(token.address),
        name: name,
        symbol: symbol,
        decimals: decimals,
        owner: toStarknetHexString(account.address),
    });

    fs.writeFileSync(`./tokens.${net}.json`, JSON.stringify(tokens, null, 4), {
        flag: "w",
    });

    console.log(`Written deployed tokens to tokens.${net}.json`);

    const chainId = await account.getChainId();

    return createTokenContract(chainId, token.address, account);
}

async function createMarket(
    account: Account,
    indexTokenAddress: string,
    longTokenAddress: string,
    shortTokenAddress: string
) {
    const chainId = await account.getChainId();

    const marketFactoryContract = createSatoruContract(
        chainId,
        SatoruContract.MarketFactory,
        MarketFactoryABI,
        account
    );

    const longTokenContract = createTokenContract(chainId, longTokenAddress);
    const shortTokenContract = createTokenContract(chainId, shortTokenAddress);

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
            console.log("MarketToken=" + marketTokenAddress);
        } else {
            throw new Error("Failed to create market");
        }
    } catch (error) {
        throw new Error("Market already settled or error occurred:", { cause: error });
    }

    if (!marketTokenAddress) return;

    // END create market

    await executeAndWait(account, [
        // BEGIN Fill the pool, this is the initial amount that depositors will put in the pool
        // Mint zETH to the market token
        createCall(longTokenContract, "mint", [
            marketTokenAddress,
            new CairoUint256(50000000000000000000000000000000000000),
        ]),
        // Mint USDC to the market token
        createCall(shortTokenContract, "mint", [
            marketTokenAddress,
            new CairoUint256(25000000000000000000000000000000000000000),
        ]),
        // END Fill the pool
        // BEGIN Fill the account, this help our account have a initial balance
        // Mint zETH to account
        createCall(longTokenContract, "mint", [
            account.address,
            new CairoUint256(9999999999999000000),
        ]),
        // Mint USDC to account
        createCall(shortTokenContract, "mint", [
            account.address,
            new CairoUint256(49999999999999999000000),
        ]),
    ]);

    console.log("All mint done.");
}

async function deployTokenThenCreateMarket() {
    const { account, net } = await settingUp();

    // BEGIN deploy tokens

    const longTokenContract = await deployToken(
        net,
        account,
        "Wolfy Ethereum",
        "wfETH",
        18,
        1000000n
    );
    const shortTokenContract = await deployToken(net, account, "Dew USD", "DUSD", 18, 1000000n);

    const indexTokenAddress = longTokenContract.address;
    const longTokenAddress = indexTokenAddress;
    const shortTokenAddress = shortTokenContract.address;

    // END deploy tokens

    createMarket(account, indexTokenAddress, longTokenAddress, shortTokenAddress);
}

// deployTokenThenCreateMarket();

// Or if you want to reuse tokens

async function createMarketWithReusedTokens() {
    const { account } = await settingUp();

    const indexTokenAddress = "0x0161304979f98530f4c3d6659e0a43cad96ceb71531482c7aaba90e07f150315";
    const longTokenAddress = indexTokenAddress;
    const shortTokenAddress = "0x0585593986c67a9802555dab7c7728270b603da6721ed6f754063eb8fd51f0aa";

    createMarket(account, indexTokenAddress, longTokenAddress, shortTokenAddress);
}

createMarketWithReusedTokens();
