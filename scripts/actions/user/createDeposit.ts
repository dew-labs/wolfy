import { CairoUint256 } from "starknet";
import { settingUp, getContracts, createAsker, expandDecimals } from "../../utils";
import {
    createCall,
    createSatoruContract,
    createTokenContract,
    DataStoreABI,
    ExchangeRouterABI,
    executeAndWait,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";

// 0xc086e05862abb8ff66db4eabadc284b24bad6f0791a70192904d7f71eb8954

async function create_deposit() {
    const contracts = getContracts();

    const depositVaultAddress = contracts.DepositVault;
    if (!depositVaultAddress) throw new Error("DEPOSIT_VAULT not set");

    const { account, chainId } = await settingUp();
    const dataStoreContract = createSatoruContract(
        chainId,
        SatoruContract.DataStore,
        DataStoreABI,
        account
    );

    const { ask, doneAsking } = createAsker();

    let marketToken = await ask("Enter market token (default to last market)");

    if (!marketToken) {
        const marketCount = BigInt(await dataStoreContract.get_market_count());
        if (marketCount === 0n) throw new Error("No market available");
        const lastMarket = (
            await dataStoreContract.get_market_keys(marketCount - 1n, marketCount)
        )[0];
        if (!lastMarket) throw new Error("Invalid market");
        marketToken = toStarknetHexString(lastMarket);
        console.log("Market:", marketToken);
    }

    const market = await dataStoreContract.get_market(marketToken);

    const indexTokenAddress = toStarknetHexString(market.index_token);
    const longTokenAddress = toStarknetHexString(market.long_token);
    const shortTokenAddress = toStarknetHexString(market.short_token);

    console.log("Index token:", indexTokenAddress);
    console.log("Long token:", longTokenAddress);
    console.log("Short token:", shortTokenAddress);

    const longTokenContract = createTokenContract(chainId, longTokenAddress);
    const shortTokenContract = createTokenContract(chainId, shortTokenAddress);

    const longTokenDecimals = await longTokenContract.decimals();
    const shortTokenDecimals = await shortTokenContract.decimals();

    const longTokenAmount = expandDecimals(
        (await ask("Enter long amount (default 50000000000)")) || 50000000000,
        longTokenDecimals
    );

    const shortTokenAmount = expandDecimals(
        (await ask("Enter short amount (default 50000000000)")) || 50000000000,
        shortTokenDecimals
    );

    const exchangeRouterContract = createSatoruContract(
        chainId,
        SatoruContract.ExchangeRouter,
        ExchangeRouterABI
    );

    console.log("Approve, mint and sending tokens to the deposit vault..."); // The mint step is to make sure account have enough balance
    await executeAndWait(account, [
        createCall(longTokenContract, "approve", [
            account.address,
            new CairoUint256(longTokenAmount),
        ]),
        createCall(longTokenContract, "mint", [account.address, new CairoUint256(longTokenAmount)]),
        createCall(exchangeRouterContract, "send_tokens", [
            longTokenAddress,
            depositVaultAddress,
            new CairoUint256(longTokenAmount),
        ]),
        createCall(shortTokenContract, "approve", [
            account.address,
            new CairoUint256(shortTokenAmount),
        ]),
        createCall(shortTokenContract, "mint", [
            account.address,
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

    const createDepositReceipt = await executeAndWait(
        account,
        createCall(exchangeRouterContract, "create_deposit", [createDepositParams])
    );

    if (createDepositReceipt.isSuccess()) {
        const depositKey = createDepositReceipt.events[0]?.data[0];

        console.log("Deposit created.");
        console.log(depositKey);
    } else {
        throw new Error("Deposit creation failed");
    }

    doneAsking();
}

create_deposit();
