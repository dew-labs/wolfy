import { ensureDeployed, settingUp } from "@dew-labs/shared/utils";
import { type Account } from "starknet";

import fs from "node:fs";

import { createTokenContract, toStarknetHexString } from "satoru-sdk";
import createMarket from "./utils/createMarket";

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

deployTokenThenCreateMarket();
