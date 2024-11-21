import {
    askOrLatestMarketToken,
    createAsker,
    executeAndGetResult,
    expandDecimals,
    getContracts,
    getDataStoreContract,
    getExchangeRouterContract,
    settingUp,
} from "@freyr/shared/utils";
import { createCall, createTokenContract, executeAndWait, toStarknetHexString } from "wolfy-sdk";
import { CairoUint256, shortString } from "starknet";

async function createWithdrawal() {
    const contracts = getContracts();

    const withdrawalVaultAddress = contracts.WithdrawalVault;
    if (!withdrawalVaultAddress) throw new Error("WITHDRAWAL_VAULT not set");

    const { account, chainId } = await settingUp();
    const dataStoreContract = getDataStoreContract(chainId, account);

    const { ask, doneAsking } = createAsker();

    const marketToken = await askOrLatestMarketToken(ask, chainId);

    const market = await dataStoreContract.get_market(marketToken);

    const longTokenAddress = toStarknetHexString(market.long_token);
    const shortTokenAddress = toStarknetHexString(market.short_token);

    const longTokenContract = createTokenContract(chainId, longTokenAddress);
    const shortTokenContract = createTokenContract(chainId, shortTokenAddress);

    const longTokenSymbol = shortString.decodeShortString(String(await longTokenContract.symbol()));
    const shortTokenSymbol = shortString.decodeShortString(
        String(await shortTokenContract.symbol())
    );

    console.log(`Market: ${longTokenSymbol}/${shortTokenSymbol}`);

    const marketTokenAddress = toStarknetHexString(market.market_token);
    const marketTokenContract = createTokenContract(chainId, marketTokenAddress);
    const marketTokenDecimals = await marketTokenContract.decimals();

    const marketTokenAmount = expandDecimals(
        (await ask("Enter market token amount (default 5000)")) || 5000,
        marketTokenDecimals
    );

    const exchangeRouterContract = getExchangeRouterContract(chainId, account);
    console.log("Approving and sending market token to the withdrawal vault...");

    // TODO: why can't we use exchangeRouterContract?
    await executeAndWait(account, [
        createCall(marketTokenContract, "approve", [
            account.address,
            // exchangeRouterContract.address,
            new CairoUint256(marketTokenAmount),
        ]),
        createCall(marketTokenContract, "transfer", [
            withdrawalVaultAddress,
            new CairoUint256(marketTokenAmount),
        ]),
        // createCall(exchangeRouterContract, "send_tokens", [
        //     marketTokenAddress,
        //     withdrawalVaultAddress,
        //     new CairoUint256(marketTokenAmount),
        // ]),
    ]);

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
