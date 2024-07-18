import { Contract } from "starknet";

import dotenv from "dotenv";
import { ensureDeclared, ensureDeployed, ensureRole, settingUp } from "../utils";

dotenv.config();

async function deploy() {
    const account0 = await settingUp();

    // -------------------------------------------------------------------------

    const roleStore = await ensureDeployed(
        account0,
        process.env.ROLE_STORE,
        "RoleStore",
        { admin: account0.address },
        true
    );

    // -------------------------------------------------------------------------

    const dataStore = await ensureDeployed(account0, process.env.DATA_STORE, "DataStore", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const roleStoreContract = new Contract(roleStore.abi, roleStore.address, account0);

    await ensureRole(roleStoreContract, "Account0", account0.address, "CONTROLLER");

    // -------------------------------------------------------------------------

    const eventEmitter = await ensureDeployed(
        account0,
        process.env.EVENT_EMITTER,
        "EventEmitter",
        {}
    );

    // -------------------------------------------------------------------------

    const oracleStore = await ensureDeployed(account0, process.env.ORACLE_STORE, "OracleStore", {
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
    });

    // -------------------------------------------------------------------------

    const oracle = await ensureDeployed(account0, process.env.ORACLE, "Oracle", {
        role_store_address: roleStore.address,
        oracle_store_address: oracleStore.address,
        pragma_address: account0.address,
    });

    // -------------------------------------------------------------------------

    const orderVault = await ensureDeployed(account0, process.env.ORDER_VAULT, "OrderVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const swapHandler = await ensureDeployed(account0, process.env.SWAP_HANDLER, "SwapHandler", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const referralStorage = await ensureDeployed(
        account0,
        process.env.REFERRAL_STORAGE,
        "ReferralStorage",
        {
            event_emitter_address: eventEmitter.address,
        }
    );

    // -------------------------------------------------------------------------

    const increaseOrderUtils = await ensureDeployed(
        account0,
        process.env.INCREASE_ORDER_UTILS,
        "IncreaseOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const decreaseOrderUtils = await ensureDeployed(
        account0,
        process.env.DECREASE_ORDER_UTILS,
        "DecreaseOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const swapOrderUtils = await ensureDeployed(
        account0,
        process.env.SWAP_ORDER_UTILS,
        "SwapOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const orderUtils = await ensureDeployed(
        account0,
        process.env.ORDER_UTILS,
        "OrderUtils",
        {
            increase_order_class_hash: increaseOrderUtils.address,
            decrease_order_class_hash: decreaseOrderUtils.classHash,
            swap_order_class_hash: swapOrderUtils.classHash,
        },
        true
    );

    // -------------------------------------------------------------------------

    const orderHandler = await ensureDeployed(account0, process.env.ORDER_HANDLER, "OrderHandler", {
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

    const depositVault = await ensureDeployed(account0, process.env.DEPOSIT_VAULT, "DepositVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const depositHandler = await ensureDeployed(
        account0,
        process.env.DEPOSIT_HANDLER,
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
        account0,
        process.env.WITHDRAWAL_VAULT,
        "WithdrawalVault",
        {
            data_store_address: dataStore.address,
            role_store_address: roleStore.address,
        }
    );

    // -------------------------------------------------------------------------

    const withdrawalHandler = await ensureDeployed(
        account0,
        process.env.WITHDRAWAL_HANDLER,
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

    const marketTokenClassHash = await ensureDeclared(account0, "MarketToken");

    // -------------------------------------------------------------------------

    const marketFactory = await ensureDeployed(
        account0,
        process.env.MARKET_FACTORY,
        "MarketFactory",
        {
            data_store_address: dataStore.address,
            role_store_address: roleStore.address,
            event_emitter_address: eventEmitter.address,
            market_token_class_hash: marketTokenClassHash,
        }
    );

    // -------------------------------------------------------------------------

    const reader = await ensureDeployed(account0, process.env.READER, "Reader", {});

    // -------------------------------------------------------------------------

    const router = await ensureDeployed(account0, process.env.ROUTER, "Router", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const exchangeRouter = await ensureDeployed(
        account0,
        process.env.EXCHANGE_ROUTER,
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

    await ensureRole(roleStoreContract, "Account0", account0.address, "MARKET_KEEPER");
    await ensureRole(roleStoreContract, "Account0", account0.address, "ORDER_KEEPER");
    await ensureRole(roleStoreContract, "OrderHandler", orderHandler.address, "CONTROLLER");
    await ensureRole(
        roleStoreContract,
        "IncreaseOrderUtils",
        increaseOrderUtils.address,
        "CONTROLLER"
    );
    await ensureRole(
        roleStoreContract,
        "DecreaseOrderUtils",
        decreaseOrderUtils.address,
        "CONTROLLER"
    );
    await ensureRole(roleStoreContract, "SwapOrderUtils", swapOrderUtils.address, "CONTROLLER");
    await ensureRole(roleStoreContract, "DepositHandler", depositHandler.address, "CONTROLLER");
    await ensureRole(
        roleStoreContract,
        "WithdrawalHandler",
        withdrawalHandler.address,
        "CONTROLLER"
    );
    await ensureRole(roleStoreContract, "SwapHandler", swapHandler.address, "CONTROLLER");
    await ensureRole(roleStoreContract, "ExchangeRouter", exchangeRouter.address, "CONTROLLER");

    console.log("All roles granted");
}

deploy();
