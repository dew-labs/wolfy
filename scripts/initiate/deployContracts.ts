import { ensureDeclared, ensureDeployed, getContracts, settingUp, type Contracts } from "../utils";
import fs from "node:fs";

async function deploy() {
    const { account, net } = await settingUp();

    const contracts = getContracts();

    // -------------------------------------------------------------------------

    const roleStore = await ensureDeployed(
        account,
        contracts.RoleStore,
        "RoleStore",
        { admin: account.address },
        true
    );

    // -------------------------------------------------------------------------

    const dataStore = await ensureDeployed(account, contracts.DataStore, "DataStore", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const eventEmitter = await ensureDeployed(account, contracts.EventEmitter, "EventEmitter", {});

    // -------------------------------------------------------------------------

    const oracleStore = await ensureDeployed(account, contracts.OracleStore, "OracleStore", {
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
    });

    // -------------------------------------------------------------------------

    // Mock pragma for testing
    const pragmaAddress = (await ensureDeployed(account, contracts.Pragma, "PriceFeed", {}))
        .address;
    // const pragmaAddress = getPragmaContract();

    // Oracle change will lead to OrderHandler, DepositHandler, WithdrawalHandler, and ExchangeRouter change
    const oracle = await ensureDeployed(account, contracts.Oracle, "Oracle", {
        role_store_address: roleStore.address,
        oracle_store_address: oracleStore.address,
        pragma_address: pragmaAddress,
    });

    // -------------------------------------------------------------------------

    const orderVault = await ensureDeployed(account, contracts.OrderVault, "OrderVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const swapHandler = await ensureDeployed(account, contracts.SwapHandler, "SwapHandler", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const referralStorage = await ensureDeployed(
        account,
        contracts.ReferralStorage,
        "ReferralStorage",
        {
            event_emitter_address: eventEmitter.address,
        }
    );

    // -------------------------------------------------------------------------

    const increaseOrderUtils = await ensureDeployed(
        account,
        contracts.IncreaseOrderUtils,
        "IncreaseOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const decreaseOrderUtils = await ensureDeployed(
        account,
        contracts.DecreaseOrderUtils,
        "DecreaseOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const swapOrderUtils = await ensureDeployed(
        account,
        contracts.SwapOrderUtils,
        "SwapOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const orderUtils = await ensureDeployed(
        account,
        contracts.OrderUtils,
        "OrderUtils",
        {
            increase_order_class_hash: increaseOrderUtils.address,
            decrease_order_class_hash: decreaseOrderUtils.classHash,
            swap_order_class_hash: swapOrderUtils.classHash,
        },
        true
    );

    // -------------------------------------------------------------------------

    const orderHandler = await ensureDeployed(account, contracts.OrderHandler, "OrderHandler", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
        order_vault_address: orderVault.address,
        oracle_address: oracle.address,
        swap_handler_address: swapHandler.address,
        referral_storage_address: referralStorage.address,
        order_utils_class_hash: orderUtils.classHash,
        increase_order_utils_class_hash: increaseOrderUtils.classHash,
        decrease_order_utils_class_hash: decreaseOrderUtils.classHash,
        swap_order_utils_class_hash: swapOrderUtils.classHash,
    });

    // -------------------------------------------------------------------------

    const depositVault = await ensureDeployed(account, contracts.DepositVault, "DepositVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const depositHandler = await ensureDeployed(
        account,
        contracts.DepositHandler,
        "DepositHandler",
        {
            data_store_address: dataStore.address,
            role_store_address: roleStore.address,
            event_emitter_address: eventEmitter.address,
            deposit_vault_address: depositVault.address,
            oracle_address: oracle.address,
        }
    );

    // -------------------------------------------------------------------------

    const withdrawalVault = await ensureDeployed(
        account,
        contracts.WithdrawalVault,
        "WithdrawalVault",
        {
            data_store_address: dataStore.address,
            role_store_address: roleStore.address,
        }
    );

    // -------------------------------------------------------------------------

    const withdrawalHandler = await ensureDeployed(
        account,
        contracts.WithdrawalHandler,
        "WithdrawalHandler",
        {
            data_store_address: dataStore.address,
            role_store_address: roleStore.address,
            event_emitter_address: eventEmitter.address,
            withdrawal_vault_address: withdrawalVault.address,
            oracle_address: oracle.address,
        }
    );

    // -------------------------------------------------------------------------

    const marketTokenClassHash = await ensureDeclared(account, "MarketToken");

    // -------------------------------------------------------------------------

    const marketFactory = await ensureDeployed(account, contracts.MarketFactory, "MarketFactory", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
        market_token_class_hash: marketTokenClassHash,
    });

    // -------------------------------------------------------------------------

    const router = await ensureDeployed(account, contracts.Router, "Router", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const exchangeRouter = await ensureDeployed(
        account,
        contracts.ExchangeRouter,
        "ExchangeRouter",
        {
            router_address: router.address,
            data_store_address: dataStore.address,
            role_store_address: roleStore.address,
            event_emitter_address: eventEmitter.address,
            deposit_handler_address: depositHandler.address,
            withdrawal_handler_address: withdrawalHandler.address,
            order_handler_address: orderHandler.address,
        }
    );

    // -------------------------------------------------------------------------

    const reader = await ensureDeployed(account, contracts.Reader, "Reader", {});

    // -------------------------------------------------------------------------

    const deployedContracts: Contracts = {
        RoleStore: roleStore.address,
        DataStore: dataStore.address,
        EventEmitter: eventEmitter.address,
        OracleStore: oracleStore.address,
        Pragma: pragmaAddress,
        Oracle: oracle.address,
        OrderVault: orderVault.address,
        SwapHandler: swapHandler.address,
        ReferralStorage: referralStorage.address,
        IncreaseOrderUtils: increaseOrderUtils.address,
        DecreaseOrderUtils: decreaseOrderUtils.address,
        SwapOrderUtils: swapOrderUtils.address,
        OrderUtils: orderUtils.address,
        OrderHandler: orderHandler.address,
        DepositVault: depositVault.address,
        DepositHandler: depositHandler.address,
        WithdrawalVault: withdrawalVault.address,
        WithdrawalHandler: withdrawalHandler.address,
        MarketFactory: marketFactory.address,
        Reader: reader.address,
        Router: router.address,
        ExchangeRouter: exchangeRouter.address,
        // Keep them unchanged
        zETH: contracts.zETH,
        USDC: contracts.USDC,
        MarketToken: contracts.MarketToken,
    };

    console.log("Deployed contracts:");
    console.log(deployedContracts);

    fs.writeFileSync(
        `${__dirname}/../../contracts.${net}.json`,
        JSON.stringify(deployedContracts, null, 4),
        {
            flag: "w",
        }
    );

    console.log(`Written deployed contracts to contracts.${net}.json`);
}

deploy();
