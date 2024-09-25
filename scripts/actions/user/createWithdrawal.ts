import {
    askOrLatestMarketToken,
    createAsker,
    executeAndGetResult,
    expandDecimals,
    getContracts,
    getDataStoreContract,
    getExchangeRouterContract,
    settingUp,
} from "@wolfy/shared/utils";
import { createCall, createTokenContract, executeAndWait, toStarknetHexString } from "satoru-sdk";
import { CairoUint256 } from "starknet";

async function createWithdrawal() {
    const contracts = getContracts();

    const withdrawalVaultAddress = contracts.WithdrawalVault;
    if (!withdrawalVaultAddress) throw new Error("WITHDRAWAL_VAULT not set");

    const { account, chainId } = await settingUp();
    const dataStoreContract = getDataStoreContract(chainId, account);

    const { ask, doneAsking } = createAsker();

    const marketToken = await askOrLatestMarketToken(ask, chainId);

    const market = await dataStoreContract.get_market(marketToken);

    const marketTokenAddress = toStarknetHexString(market.market_token);
    const marketTokenContract = createTokenContract(chainId, marketTokenAddress);
    const marketTokenDecimals = await marketTokenContract.decimals();

    const marketTokenAmount = expandDecimals(
        (await ask("Enter market amount (default 5000)")) || 5000,
        marketTokenDecimals
    );

    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    console.log("Mint, approve and sending market token to the withdrawal vault..."); // The mint step is to make sure account have enough balance

    console.log("Minting market token...");
    await executeAndWait(account, [
        createCall(marketTokenContract, "mint", [
            account.address,
            new CairoUint256(marketTokenAmount),
        ]),
    ]);

    console.log("Approving market token...");
    await executeAndWait(account, [
        createCall(marketTokenContract, "approve", [
            account.address,
            new CairoUint256(marketTokenAmount),
        ]),
    ]);

    console.log(marketTokenAmount, marketTokenDecimals);
    console.log("Sending market token to the withdrawal vault...");
    await executeAndWait(account, [
        createCall(exchangeRouterContract, "send_tokens", [
            marketTokenAddress,
            withdrawalVaultAddress,
            new CairoUint256(marketTokenAmount),
        ]),
    ]);

    // await executeAndWait(account, [
    //     createCall(marketTokenContract, "mint", [
    //         account.address,
    //         new CairoUint256(marketTokenAmount),
    //     ]),
    //     createCall(marketTokenContract, "approve", [
    //         account.address,
    //         new CairoUint256(marketTokenAmount),
    //     ]),
    //     createCall(exchangeRouterContract, "send_tokens", [
    //         marketTokenAddress,
    //         withdrawalVaultAddress,
    //         new CairoUint256(marketTokenAmount),
    //     ]),
    // ]);

    console.log("Creating Withdrawal...");

    const createWithdrawalParams = {
        receiver: account.address,
        callback_contract: "0",
        ui_fee_receiver: "0",
        market: marketTokenAddress,
        long_token_swap_path: { snapshot: [] },
        short_token_swap_path: { snapshot: [] },
        min_long_token_amount: new CairoUint256(0),
        min_short_token_amount: new CairoUint256(0),
        execution_fee: new CairoUint256(0),
        callback_gas_limit: new CairoUint256(0),
    };

    await executeAndGetResult(
        account,
        createCall(exchangeRouterContract, "create_withdrawal", [createWithdrawalParams]),
        (receipt) => {
            const withdrawalKey = receipt.events[0]?.data[0];

            console.log("Withdrawal created.");
            console.log(withdrawalKey);
        },
        "Withdrawal creation failed"
    );

    doneAsking();
}

createWithdrawal();
