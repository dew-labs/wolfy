import { ensureDeployed } from "packages/shared/src/utils";
import type { Account } from "starknet";
import fs from "node:fs";
import { createTokenContract, toStarknetHexString } from "wolfy-sdk";

export default async function deployToken(
    net: string,
    account: Account,
    name: string,
    symbol: string,
    decimals: number | bigint = 18,
    initialSupply: number | bigint = 1000000n,
    pythPriceId?: string
) {
    const token = await ensureDeployed(account, undefined, "ERC20", {
        name: name,
        symbol: symbol,
        decimals: decimals,
        initial_supply: BigInt(initialSupply) * 10n ** BigInt(decimals),
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
        pythPriceId: pythPriceId,
    });

    fs.writeFileSync(`./tokens.${net}.json`, JSON.stringify(tokens, null, 4), {
        flag: "w",
    });

    console.log(`Written deployed ${symbol} token to tokens.${net}.json`);

    const chainId = await account.getChainId();

    return createTokenContract(chainId, token.address, account);
}
