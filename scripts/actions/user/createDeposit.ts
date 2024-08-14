import { num, CairoUint256 } from "starknet";
import { getContracts, settingUp, ask, doneAsking } from "../../utils";
import {
    createCall,
    createSatoruContract,
    createTokenContract,
    DataStoreABI,
    ExchangeRouterABI,
    executeAndWait,
    SatoruContract,
} from "satoru-sdk";

async function create_deposit() {
    const contracts = getContracts();
    const depositVaultAddress = contracts.DepositVault;

    if (!depositVaultAddress) throw new Error("DEPOSIT_VAULT not set");

    const marketToken = await ask("Enter market token");

    if (!marketToken) throw new Error("Invalid long order key");

    const { account, chainId } = await settingUp();

    const dataStoreContract = createSatoruContract(
        chainId,
        SatoruContract.DataStore,
        DataStoreABI,
        account
    );
    const market = await dataStoreContract.get_market(marketToken);

    const indexTokenAddress = num.toHex(market.index_token);
    const longTokenAddress = num.toHex(market.long_token);
    const shortTokenAddress = num.toHex(market.short_token);

    console.log("Index token:", indexTokenAddress);
    console.log("Long token:", longTokenAddress);
    console.log("Short token:", shortTokenAddress);

    const longTokenAmount =
        (await ask("Enter long amount (default 50000000000000000000000000000)")) ||
        50000000000000000000000000000n;

    const shortTokenAmount =
        (await ask("Enter short amount (default 50000000000000000000000000000)")) ||
        50000000000000000000000000000n;

    const shortTokenContract = createTokenContract(chainId, shortTokenAddress);

    const longTokenContract = createTokenContract(chainId, longTokenAddress);
    const exchangeRouterContract = createSatoruContract(
        chainId,
        SatoruContract.ExchangeRouter,
        ExchangeRouterABI
    );

    console.log("Approve, mint and sending tokens to the deposit vault..."); // The mint step is to make sure account have enough balance
    await executeAndWait(
        chainId,
        [
            createCall(longTokenContract, "approve", [
                account.address,
                new CairoUint256(longTokenAmount),
            ]),
            createCall(longTokenContract, "mint", [
                account.address,
                new CairoUint256(longTokenAmount),
            ]),
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
        ],
        account
    );

    console.log("Creating Deposit...");

    const createDepositParams = {
        receiver: account.address,
        callback_contract: "0x0",
        ui_fee_receiver: "0x0",
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
        chainId,
        createCall(exchangeRouterContract, "create_deposit", [createDepositParams]),
        account
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
