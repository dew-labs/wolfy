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
import { createCall, createTokenContract, executeAndWait, toStarknetHexString } from "satoru-sdk";
import { CairoUint256 } from "starknet";

async function createDeposit() {
    const contracts = getContracts();

    const depositVaultAddress = contracts.DepositVault;
    if (!depositVaultAddress) throw new Error("DEPOSIT_VAULT not set");

    const { account, chainId } = await settingUp();
    const dataStoreContract = getDataStoreContract(chainId, account);

    const { ask, doneAsking } = createAsker();

    const marketToken = await askOrLatestMarketToken(ask, chainId);

    const market = await dataStoreContract.get_market(marketToken);

    const longTokenAddress = toStarknetHexString(market.long_token);
    const shortTokenAddress = toStarknetHexString(market.short_token);

    const longTokenContract = createTokenContract(chainId, longTokenAddress);
    const shortTokenContract = createTokenContract(chainId, shortTokenAddress);

    const longTokenDecimals = await longTokenContract.decimals();
    const shortTokenDecimals = await shortTokenContract.decimals();

    const longTokenAmount = expandDecimals(await ask("Enter long amount"), longTokenDecimals);
    const shortTokenAmount = expandDecimals(await ask("Enter short amount"), shortTokenDecimals);

    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    console.log("Approve and sending tokens to the deposit vault..."); // The mint step is to make sure account have enough balance

    await executeAndWait(account, [
        createCall(longTokenContract, "approve", [
            exchangeRouterContract.address,
            new CairoUint256(longTokenAmount),
        ]),
        createCall(exchangeRouterContract, "send_tokens", [
            longTokenAddress,
            depositVaultAddress,
            new CairoUint256(longTokenAmount),
        ]),
        createCall(shortTokenContract, "approve", [
            exchangeRouterContract.address,
            new CairoUint256(shortTokenAmount),
        ]),
        createCall(exchangeRouterContract, "send_tokens", [
            shortTokenAddress,
            depositVaultAddress,
            new CairoUint256(shortTokenAmount),
        ]),
    ]);

    console.log("Creating Deposit...");

    const createDepositParams = {
        receiver: account.address,
        callback_contract: "0",
        ui_fee_receiver: "0",
        market: marketToken,
        initial_long_token: longTokenContract.address,
        initial_short_token: shortTokenContract.address,
        long_token_swap_path: { snapshot: [] },
        short_token_swap_path: { snapshot: [] },
        min_market_tokens: new CairoUint256(0),
        execution_fee: new CairoUint256(0),
        callback_gas_limit: new CairoUint256(0),
    };

    await executeAndGetResult(
        account,
        createCall(exchangeRouterContract, "create_deposit", [createDepositParams]),
        (receipt) => {
            const depositKey = receipt.events[0]?.data[0];

            console.log("Deposit created.");
            console.log(depositKey);
        },
        "Deposit creation failed"
    );

    doneAsking();
}

createDeposit();
