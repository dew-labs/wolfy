import { createCall, createTokenContract, executeAndWait } from "satoru-sdk";
import { ensureDeployed, getContracts, settingUp } from "../../utils";
import { CairoUint256 } from "starknet";

async function createMockToken() {
    const { account, chainId } = await settingUp();
    const contracts = getContracts();

    // deploy index token, long token
    const zEth = await ensureDeployed(account, contracts.zETH, "ERC20", {
        name: "zEthereum",
        symbol: "zETH",
        initial_supply: 1000000,
        recipient: account.address,
    });

    // deploy short token
    const usdc = await ensureDeployed(account, contracts.USDC, "ERC20", {
        name: "USDC",
        symbol: "USDC",
        initial_supply: 1000000,
        recipient: account.address,
    });

    const usdcContract = createTokenContract(chainId, usdc.address, account);
    const zEthContract = createTokenContract(chainId, zEth.address, account);

    // BEGIN Fill the account, this help our account have a initial balance
    // Mint zETH to account
    await executeAndWait(
        chainId,
        createCall(zEthContract, "mint", [account.address, new CairoUint256(9999999999999000000)]),
        account
    );

    // Mint USDC to account
    await executeAndWait(
        chainId,
        createCall(usdcContract, "mint", [
            account.address,
            new CairoUint256(49999999999999999000000),
        ]),
        account
    );
    // EMD Fill the account
}

createMockToken();
