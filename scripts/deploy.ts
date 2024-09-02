import {
    createCall,
    createSatoruContract,
    DataStoreABI,
    executeAndWait,
    grantRole,
    SatoruContract,
    SatoruRole,
} from "satoru-sdk";
import {
    ensureDeclared,
    ensureDeployed,
    getContracts,
    getKey,
    settingUp,
    type Contracts,
} from "shared/utils";

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
    };

    console.log("Deployed contracts:");
    console.log(deployedContracts);

    fs.writeFileSync(`./contracts.${net}.json`, JSON.stringify(deployedContracts, null, 4), {
        flag: "w",
    });

    console.log(`Written deployed contracts to contracts.${net}.json`);
}

async function grantRoles() {
    const { account, chainId } = await settingUp();

    const contracts = getContracts();

    const increaseOrderUtilsAddress = contracts.IncreaseOrderUtils;
    const decreaseOrderUtilsAddress = contracts.DecreaseOrderUtils;
    const swapOrderUtilsAddress = contracts.SwapOrderUtils;
    const orderUtilsAddress = contracts.OrderUtils;
    const depositHandlerAddress = contracts.DepositHandler;
    const withdrawalHandlerAddress = contracts.WithdrawalHandler;
    const orderHandlerAddress = contracts.OrderHandler;
    const swapHandlerAddress = contracts.SwapHandler;
    const exchangeRouterAddress = contracts.ExchangeRouter;
    const marketFactoryAddress = contracts.MarketFactory;

    if (
        !increaseOrderUtilsAddress ||
        !decreaseOrderUtilsAddress ||
        !swapOrderUtilsAddress ||
        !orderUtilsAddress ||
        !depositHandlerAddress ||
        !withdrawalHandlerAddress ||
        !orderHandlerAddress ||
        !swapHandlerAddress ||
        !exchangeRouterAddress ||
        !marketFactoryAddress
    ) {
        throw new Error("Missing required contract addresses.");
    }

    // -------------------------------------------------------------------------

    // Grant roles to Account0 (deployment account)
    await grantRole(
        chainId,
        account,
        account.address,
        [
            SatoruRole.ROLE_ADMIN,
            SatoruRole.CONTROLLER,
            SatoruRole.ORDER_KEEPER,
            SatoruRole.MARKET_KEEPER,
            SatoruRole.FROZEN_ORDER_KEEPER,
            // router plugin role is sus?
            SatoruRole.ROUTER_PLUGIN,
        ],
        "Account0"
    );

    // -------------------------------------------------------------------------

    // Grant roles to utils
    await grantRole(
        chainId,
        account,
        increaseOrderUtilsAddress,
        SatoruRole.CONTROLLER,
        "IncreaseOrderUtils"
    );
    await grantRole(
        chainId,
        account,
        decreaseOrderUtilsAddress,
        SatoruRole.CONTROLLER,
        "DecreaseOrderUtils"
    );
    await grantRole(
        chainId,
        account,
        swapOrderUtilsAddress,
        SatoruRole.CONTROLLER,
        "SwapOrderUtils"
    );
    await grantRole(chainId, account, orderUtilsAddress, SatoruRole.CONTROLLER, "OrderUtils");

    // -------------------------------------------------------------------------

    // Grant roles to handlers
    await grantRole(
        chainId,
        account,
        depositHandlerAddress,
        SatoruRole.CONTROLLER,
        "DepositHandler"
    );
    await grantRole(
        chainId,
        account,
        withdrawalHandlerAddress,
        SatoruRole.CONTROLLER,
        "WithdrawalHandler"
    );
    await grantRole(chainId, account, swapHandlerAddress, SatoruRole.CONTROLLER, "SwapHandler");
    await grantRole(
        chainId,
        account,
        orderHandlerAddress,
        [
            SatoruRole.CONTROLLER,
            // frozen keeper role is sus?
            SatoruRole.FROZEN_ORDER_KEEPER,
        ],
        "OrderHandler"
    );

    // -------------------------------------------------------------------------

    // Grant roles to exchange router
    await grantRole(
        chainId,
        account,
        exchangeRouterAddress,
        [
            SatoruRole.CONTROLLER,
            SatoruRole.ROUTER_PLUGIN,
            // Order keeper role is sus?
            SatoruRole.ORDER_KEEPER,
        ],
        "ExchangeRouter"
    );

    // -------------------------------------------------------------------------

    // Grant roles to market factory
    await grantRole(
        chainId,
        account,
        marketFactoryAddress,
        [SatoruRole.MARKET_KEEPER, SatoruRole.CONTROLLER],
        "MarketFactory"
    );

    // -------------------------------------------------------------------------

    console.log("All roles granted");
}

async function config() {
    const { account, chainId, feeToken } = await settingUp();

    const dataStoreContract = createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI);

    await executeAndWait(account, [
        // set fee token
        createCall(dataStoreContract, "set_address", [getKey("FEE_TOKEN"), feeToken]),
        // set max swap path length
        createCall(dataStoreContract, "set_u256", [getKey("MAX_SWAP_PATH_LENGTH"), 5]),
    ]);

    console.log("Done config");
}

async function deployApp() {
    await deploy();
    await grantRoles();
    await config();
}

deployApp();
