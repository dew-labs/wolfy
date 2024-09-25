import {
    createAsker,
    ensureDeclared,
    ensureDeployed,
    getContracts,
    settingUp,
} from "@wolfy/shared/utils";
import {
    createCall,
    createSatoruContract,
    DataStoreABI,
    executeAndWait,
    grantRole,
    poseidonHash,
    SatoruContract,
    SatoruRole,
} from "satoru-sdk";

import type { Contracts } from "@wolfy/shared/interfaces";
import fs from "node:fs";

async function deploy() {
    const { account, net } = await settingUp();

    const contracts = getContracts();

    // -------------------------------------------------------------------------

    const marketTokenClassHash = await ensureDeclared(account, "MarketToken");

    // -------------------------------------------------------------------------

    // Mock pragma for testing
    const pragmaAddress = (await ensureDeployed(account, contracts.Pragma, "PriceFeed", {}))
        .address;
    // const pragmaAddress = getPragmaContract();

    // -------------------------------------------------------------------------

    const reader = await ensureDeployed(account, contracts.Reader, "Reader", {});

    // -------------------------------------------------------------------------

    const roleStore = await ensureDeployed(
        account,
        contracts.RoleStore,
        "RoleStore",
        { admin: account.address },
        true
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

    const eventEmitter = await ensureDeployed(account, contracts.EventEmitter, "EventEmitter", {});

    // -------------------------------------------------------------------------

    const router = await ensureDeployed(account, contracts.Router, "Router", {
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

    const dataStore = await ensureDeployed(account, contracts.DataStore, "DataStore", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const oracleStore = await ensureDeployed(account, contracts.OracleStore, "OracleStore", {
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
    });

    // -------------------------------------------------------------------------

    const swapHandler = await ensureDeployed(account, contracts.SwapHandler, "SwapHandler", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const feeHandler = await ensureDeployed(account, contracts.FeeHandler, "FeeHandler", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
    });

    // -------------------------------------------------------------------------

    const marketFactory = await ensureDeployed(account, contracts.MarketFactory, "MarketFactory", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
        market_token_class_hash: marketTokenClassHash,
    });

    // -------------------------------------------------------------------------

    const orderVault = await ensureDeployed(account, contracts.OrderVault, "OrderVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const depositVault = await ensureDeployed(account, contracts.DepositVault, "DepositVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
    });

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

    // Oracle change will lead to OrderHandler, DepositHandler, WithdrawalHandler, and ExchangeRouter change
    const oracle = await ensureDeployed(account, contracts.Oracle, "Oracle", {
        role_store_address: roleStore.address,
        oracle_store_address: oracleStore.address,
        pragma_address: pragmaAddress,
    });

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

    const liquidationHandler = await ensureDeployed(
        account,
        contracts.LiquidationHandler,
        "LiquidationHandler",
        {
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
        }
    );

    // -------------------------------------------------------------------------

    const adlHandler = await ensureDeployed(account, contracts.AdlHandler, "AdlHandler", {
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

    const deployedContracts: Contracts = {
        Pragma: pragmaAddress,
        Reader: reader.address,
        RoleStore: roleStore.address,
        IncreaseOrderUtils: increaseOrderUtils.address,
        DecreaseOrderUtils: decreaseOrderUtils.address,
        SwapOrderUtils: swapOrderUtils.address,
        OrderUtils: orderUtils.address,
        EventEmitter: eventEmitter.address,
        //-------------------------------------------------
        Router: router.address, // depends on roleStore
        ReferralStorage: referralStorage.address, // depends on eventEmitter
        DataStore: dataStore.address, // depends on roleStore
        OracleStore: oracleStore.address, // depends on roleStore and EventEmitter
        SwapHandler: swapHandler.address, // depends on roleStore
        //-------------------------------------------------
        FeeHandler: feeHandler.address, // depends on dataStore, eventEmitter
        MarketFactory: marketFactory.address, // depends on dataStore, eventEmitter
        OrderVault: orderVault.address, // depends on dataStore
        DepositVault: depositVault.address, // depends on dataStore
        WithdrawalVault: withdrawalVault.address, // depends on dataStore
        Oracle: oracle.address, // depends on oracleStore and pragma
        //-------------------------------------------------
        OrderHandler: orderHandler.address,
        WithdrawalHandler: withdrawalHandler.address,
        DepositHandler: depositHandler.address,
        LiquidationHandler: liquidationHandler.address,
        AdlHandler: adlHandler.address,
        ExchangeRouter: exchangeRouter.address,
    };

    console.log("Deployed contracts:");
    console.log(deployedContracts);

    fs.writeFileSync(`./contracts.${net}.json`, JSON.stringify(deployedContracts, null, 4), {
        flag: "w",
    });

    console.log(`Written deployed contracts to contracts.${net}.json`);
}

async function grantRoles(additionAdmins?: string[]) {
    const { account, chainId } = await settingUp();

    const contracts = getContracts();

    const increaseOrderUtilsAddress = contracts.IncreaseOrderUtils;
    const decreaseOrderUtilsAddress = contracts.DecreaseOrderUtils;
    const swapOrderUtilsAddress = contracts.SwapOrderUtils;
    const orderUtilsAddress = contracts.OrderUtils;
    const depositHandlerAddress = contracts.DepositHandler;
    const withdrawalHandlerAddress = contracts.WithdrawalHandler;
    const liquidationHandlerAddress = contracts.LiquidationHandler;
    const adlHandlerAddress = contracts.AdlHandler;
    const orderHandlerAddress = contracts.OrderHandler;
    const swapHandlerAddress = contracts.SwapHandler;
    const feeHandlerAddress = contracts.FeeHandler;
    const exchangeRouterAddress = contracts.ExchangeRouter;
    const marketFactoryAddress = contracts.MarketFactory;

    if (
        !increaseOrderUtilsAddress ||
        !decreaseOrderUtilsAddress ||
        !swapOrderUtilsAddress ||
        !orderUtilsAddress ||
        !depositHandlerAddress ||
        !withdrawalHandlerAddress ||
        !liquidationHandlerAddress ||
        !adlHandlerAddress ||
        !orderHandlerAddress ||
        !swapHandlerAddress ||
        !exchangeRouterAddress ||
        !marketFactoryAddress ||
        !feeHandlerAddress
    ) {
        throw new Error("Missing required contract addresses.");
    }

    // -------------------------------------------------------------------------

    const ADMIN_ROLEs = [
        SatoruRole.CONTROLLER,
        SatoruRole.ORDER_KEEPER,
        SatoruRole.MARKET_KEEPER,
        SatoruRole.FROZEN_ORDER_KEEPER,
        SatoruRole.FEE_KEEPER,
        SatoruRole.CONFIG_KEEPER,
        SatoruRole.LIQUIDATION_KEEPER,
        SatoruRole.ADL_KEEPER,
        // SatoruRole.TIMELOCK_ADMIN
        // SatoruRole.TIMELOCK_MULTISIG
        // router plugin role is sus?
        SatoruRole.ROUTER_PLUGIN,
    ];

    // Grant roles to Account0 (deployment account)
    await grantRole(
        chainId,
        account,
        account.address,
        [SatoruRole.ROLE_ADMIN, ...ADMIN_ROLEs],
        "Account0"
    );

    if (additionAdmins) {
        for (const adminIdx in additionAdmins) {
            await grantRole(
                chainId,
                account,
                additionAdmins[adminIdx]!,
                ADMIN_ROLEs,
                `Additional Admin #${adminIdx}`
            );
        }
    }

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
        liquidationHandlerAddress,
        SatoruRole.CONTROLLER,
        "LiquidationHandler"
    );
    await grantRole(chainId, account, adlHandlerAddress, SatoruRole.CONTROLLER, "AdlHandler");
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
        createCall(dataStoreContract, "set_address", [poseidonHash("FEE_TOKEN"), feeToken]),
        // set max swap path length
        createCall(dataStoreContract, "set_u256", [poseidonHash("MAX_SWAP_PATH_LENGTH"), 5]),
    ]);

    console.log("Done config");
}

async function deployApp() {
    await deploy();

    const { ask, doneAsking } = createAsker();

    const additionAdmins = await ask("Enter additional admins (comma separated)");

    await grantRoles(additionAdmins ? additionAdmins.split(",") : undefined);
    await config();

    doneAsking();
}

deployApp();
