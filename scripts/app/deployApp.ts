import { Contract } from "starknet";
import {
    ensureDeclared,
    ensureDeployed,
    ensureRole,
    getContracts,
    getPragmaContract,
    settingUp,
} from "../utils";

async function deploy() {
    const { account } = await settingUp();

    const contracts = getContracts();

    // -------------------------------------------------------------------------

    const roleStore = await ensureDeployed(
        account,
        contracts.ROLE_STORE,
        "RoleStore",
        { admin: account.address },
        true
    );

    // -------------------------------------------------------------------------

    const dataStore = await ensureDeployed(account, contracts.DATA_STORE, "DataStore", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const roleStoreContract = new Contract(roleStore.abi, roleStore.address, account);

    await ensureRole(roleStoreContract, "Account0", account.address, "CONTROLLER");

    // -------------------------------------------------------------------------

    const eventEmitter = await ensureDeployed(account, contracts.EVENT_EMITTER, "EventEmitter", {});

    // -------------------------------------------------------------------------

    const oracleStore = await ensureDeployed(account, contracts.ORACLE_STORE, "OracleStore", {
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
    });

    // -------------------------------------------------------------------------

    const oracle = await ensureDeployed(account, contracts.ORACLE, "Oracle", {
        role_store_address: roleStore.address,
        oracle_store_address: oracleStore.address,
        pragma_address: getPragmaContract(),
    });

    // -------------------------------------------------------------------------

    const orderVault = await ensureDeployed(account, contracts.ORDER_VAULT, "OrderVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const swapHandler = await ensureDeployed(account, contracts.SWAP_HANDLER, "SwapHandler", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const referralStorage = await ensureDeployed(
        account,
        contracts.REFERRAL_STORAGE,
        "ReferralStorage",
        {
            event_emitter_address: eventEmitter.address,
        }
    );

    // -------------------------------------------------------------------------

    const increaseOrderUtils = await ensureDeployed(
        account,
        contracts.INCREASE_ORDER_UTILS,
        "IncreaseOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const decreaseOrderUtils = await ensureDeployed(
        account,
        contracts.DECREASE_ORDER_UTILS,
        "DecreaseOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const swapOrderUtils = await ensureDeployed(
        account,
        contracts.SWAP_ORDER_UTILS,
        "SwapOrderUtils",
        {},
        true
    );

    // -------------------------------------------------------------------------

    const orderUtils = await ensureDeployed(
        account,
        contracts.ORDER_UTILS,
        "OrderUtils",
        {
            increase_order_class_hash: increaseOrderUtils.address,
            decrease_order_class_hash: decreaseOrderUtils.classHash,
            swap_order_class_hash: swapOrderUtils.classHash,
        },
        true
    );

    // -------------------------------------------------------------------------

    const orderHandler = await ensureDeployed(account, contracts.ORDER_HANDLER, "OrderHandler", {
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

    const depositVault = await ensureDeployed(account, contracts.DEPOSIT_VAULT, "DepositVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const depositHandler = await ensureDeployed(
        account,
        contracts.DEPOSIT_HANDLER,
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
        contracts.WITHDRAWAL_VAULT,
        "WithdrawalVault",
        {
            data_store_address: dataStore.address,
            role_store_address: roleStore.address,
        }
    );

    // -------------------------------------------------------------------------

    const withdrawalHandler = await ensureDeployed(
        account,
        contracts.WITHDRAWAL_HANDLER,
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

    await ensureDeployed(account, contracts.MARKET_FACTORY, "MarketFactory", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
        market_token_class_hash: marketTokenClassHash,
    });

    // -------------------------------------------------------------------------

    await ensureDeployed(account, contracts.READER, "Reader", {});

    // -------------------------------------------------------------------------

    const router = await ensureDeployed(account, contracts.ROUTER, "Router", {
        role_store_address: roleStore.address,
    });

    // -------------------------------------------------------------------------

    const exchangeRouter = await ensureDeployed(
        account,
        contracts.EXCHANGE_ROUTER,
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

    await ensureRole(roleStoreContract, "Account0", account.address, "MARKET_KEEPER");
    await ensureRole(roleStoreContract, "Account0", account.address, "ORDER_KEEPER");
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
