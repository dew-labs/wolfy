import { createCall, createTokenContract, executeAndWait } from "satoru-sdk";
import { createAsker, ensureDeployed, settingUp } from "../../utils";
import { CairoUint256 } from "starknet";
import fs from "node:fs";

async function createMockToken() {
    const { account, net, chainId } = await settingUp();

    const { ask, doneAsking } = createAsker();

    const tokenName = await ask("Token name");
    if (!tokenName) throw new Error("Token name is required");

    const tokenSymbol = await ask("Token symbol");
    if (!tokenSymbol) throw new Error("Token symbol is required");

    const initialSupply = Number(await ask("Initial supply (default 1000000)")) || 1000000;
    const mintAmount =
        BigInt(await ask("Amount to mint (default 9999999999999000000)")) || 9999999999999000000n;

    // deploy token
    const token = await ensureDeployed(account, undefined, "ERC20", {
        name: tokenName,
        symbol: tokenSymbol,
        initial_supply: initialSupply,
        recipient: account.address,
    });

    const tokenContract = createTokenContract(chainId, token.address, account);

    // Fill the account, this help our account have a initial balance
    await executeAndWait(
        account,
        createCall(tokenContract, "mint", [account.address, new CairoUint256(mintAmount)])
    );

    let tokens = [];

    try {
        tokens = JSON.parse(fs.readFileSync(`./tokens.${net}.json`).toString("ascii"));
    } catch {}

    if (!Array.isArray(tokens)) tokens = [];

    tokens.push({
        address: token.address,
        name: tokenName,
        symbol: tokenSymbol,
        owner: account.address,
    });

    fs.writeFileSync(`./tokens.${net}.json`, JSON.stringify(tokens, null, 4), {
        flag: "w",
    });

    console.log(`Written deployed tokens to tokens.${net}.json`);

    doneAsking();
}

createMockToken();
