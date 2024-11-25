import {
    createAsker,
    decimalToFloat,
    ensureDeclared,
    ensureDeployed,
    expandDecimals,
    getContracts,
    settingUp,
} from "@freyr/shared/utils";
import {
    createCall,
    createWolfyContract,
    DataStoreABI,
    executeAndWait,
    grantRole,
    poseidonHash,
    WolfyContract,
    WolfyRole,
} from "wolfy-sdk";

import type { Contracts } from "@freyr/shared/interfaces";
import fs from "node:fs";
import * as dataStoreKeys from "wolfy-sdk/dataStore";

export const GENERAL_CONFIGS = {
    maxUiFeeFactor: decimalToFloat(2, 4), // 0.0002, 0.02%,
    minHandleExecutionErrorGas: 1_000, // measured gas required for an order cancellation: ~600

    maxSwapPathLength: 5,

    depositGasLimitSingle: 1_500,
    depositGasLimitMultiple: 1_800,
    withdrawalGasLimit: 1_500,

    singleSwapGasLimit: 1_000, // measured gas required for a swap in a market increase order: ~600
    increaseOrderGasLimit: 4_000,
    decreaseOrderGasLimit: 4_000,
    swapOrderGasLimit: 3_000,

    tokenTransferGasLimit: 200,
    nativeTokenTransferGasLimit: 50,

    estimatedGasFeeBaseAmount: 500, // measured gas for an order execution without any main logic: ~500
    estimatedGasFeeMultiplierFactor: expandDecimals(1, 30),

    executionGasFeeBaseAmount: 500, // measured gas for an order execution without any main logic: ~500
    executionGasFeeMultiplierFactor: expandDecimals(1, 30),

    maxCallbackGasLimit: 2_000,
    minCollateralUsd: decimalToFloat(1),

    minPositionSizeUsd: decimalToFloat(1),
    claimableCollateralTimeDivisor: 60 * 60,

    positionFeeReceiverFactor: decimalToFloat(37, 2), // 37%
    swapFeeReceiverFactor: decimalToFloat(37, 2), // 37%
    borrowingFeeReceiverFactor: decimalToFloat(37, 2), // 37%

    skipBorrowingFeeForSmallerSide: true,
    requestExpirationBlockAge: 0,
};

// const networkConfigs = {
//     arbitrumGoerli: {
//         requestExpirationBlockAge: 1200, // about 5 minutes assuming 4 blocks per second
//     },
//     avalancheFuji: {
//         requestExpirationBlockAge: 200, // about 5 minutes assuming 1 block per 3 seconds
//     },
//     arbitrum: {
//         requestExpirationBlockAge: 1200, // about 5 minutes assuming 4 blocks per second
//         estimatedGasFeeBaseAmount: 2_500_000,
//         executionGasFeeBaseAmount: 2_500_000,
//     },
//     avalanche: {
//         requestExpirationBlockAge: 200, // about 5 minutes assuming 1 block per 3 seconds
//         estimatedGasFeeBaseAmount: 1_000_000,
//         executionGasFeeBaseAmount: 1_000_000,
//     },
// };

async function deploy() {
    const { account, net } = await settingUp();

    const contracts = getContracts();

    // -------------------------------------------------------------------------

    const marketTokenClassHash = await ensureDeclared(account, "MarketToken");

    // -------------------------------------------------------------------------

    const roleModuleClassHash = await ensureDeclared(account, "RoleModule");

    // -------------------------------------------------------------------------

    const bankClassHash = await ensureDeclared(account, "Bank");

    // -------------------------------------------------------------------------

    const strictBankClassHash = await ensureDeclared(account, "StrictBank");

    // -------------------------------------------------------------------------

    const governableClassHash = await ensureDeclared(account, "Governable");

    // -------------------------------------------------------------------------

    const increaseOrderUtilsClassHash = await ensureDeclared(account, "IncreaseOrderUtils");

    // -------------------------------------------------------------------------

    const decreaseOrderUtilsClassHash = await ensureDeclared(account, "DecreaseOrderUtils");

    // -------------------------------------------------------------------------

    const swapOrderUtilsClassHash = await ensureDeclared(account, "SwapOrderUtils");

    // -------------------------------------------------------------------------

    const orderUtilsClassHash = await ensureDeclared(account, "OrderUtils");

    // -------------------------------------------------------------------------

    const baseOrderHandlerClassHash = await ensureDeclared(account, "BaseOrderHandler");

    // -------------------------------------------------------------------------

    const marketUtilsClassHash = await ensureDeclared(account, "MarketUtils");

    // -------------------------------------------------------------------------

    // Mock pragma for testing
    const pragmaAddress = (await ensureDeployed(account, contracts.Pragma, "PriceFeed", {}))
        .address;
    // const pragmaAddress = getPragmaContract();

    // -------------------------------------------------------------------------

    const reader = await ensureDeployed(account, contracts.Reader, "Reader", {
        market_utils_class_hash: marketUtilsClassHash,
    });

    // -------------------------------------------------------------------------

    const roleStore = await ensureDeployed(
        account,
        contracts.RoleStore,
        "RoleStore",
        { admin: account.address },
        true
    );

    // -------------------------------------------------------------------------

    const eventEmitter = await ensureDeployed(account, contracts.EventEmitter, "EventEmitter", {});

    // -------------------------------------------------------------------------

    const router = await ensureDeployed(account, contracts.Router, "Router", {
        role_store_address: roleStore.address,
        role_module_class_hash: roleModuleClassHash,
    });

    // -------------------------------------------------------------------------

    const referralStorage = await ensureDeployed(
        account,
        contracts.ReferralStorage,
        "ReferralStorage",
        {
            event_emitter_address: eventEmitter.address,
            governable_class_hash: governableClassHash,
        }
    );

    // -------------------------------------------------------------------------

    const dataStore = await ensureDeployed(account, contracts.DataStore, "DataStore", {
        role_store_address: roleStore.address,
        role_module_class_hash: roleModuleClassHash,
    });

    // -------------------------------------------------------------------------

    const oracleStore = await ensureDeployed(account, contracts.OracleStore, "OracleStore", {
        event_emitter_address: eventEmitter.address,
    });

    // -------------------------------------------------------------------------

    const swapHandler = await ensureDeployed(account, contracts.SwapHandler, "SwapHandler", {
        role_store_address: roleStore.address,
        role_module_class_hash: roleModuleClassHash,
        market_utils_class_hash: marketUtilsClassHash,
    });

    // -------------------------------------------------------------------------

    const feeHandler = await ensureDeployed(account, contracts.FeeHandler, "FeeHandler", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
        role_module_class_hash: roleModuleClassHash,
        market_utils_class_hash: marketUtilsClassHash,
    });

    // -------------------------------------------------------------------------

    const marketFactory = await ensureDeployed(account, contracts.MarketFactory, "MarketFactory", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        event_emitter_address: eventEmitter.address,
        market_token_class_hash: marketTokenClassHash,
        bank_class_hash: bankClassHash,
        role_module_class_hash: roleModuleClassHash,
    });

    // -------------------------------------------------------------------------

    const orderVault = await ensureDeployed(account, contracts.OrderVault, "OrderVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        strict_bank_class_hash: strictBankClassHash,
        bank_class_hash: bankClassHash,
        role_module_class_hash: roleModuleClassHash,
    });

    // -------------------------------------------------------------------------

    const depositVault = await ensureDeployed(account, contracts.DepositVault, "DepositVault", {
        data_store_address: dataStore.address,
        role_store_address: roleStore.address,
        strict_bank_class_hash: strictBankClassHash,
        bank_class_hash: bankClassHash,
        role_module_class_hash: roleModuleClassHash,
    });

    // -------------------------------------------------------------------------

    const withdrawalVault = await ensureDeployed(
        account,
        contracts.WithdrawalVault,
        "WithdrawalVault",
        {
            data_store_address: dataStore.address,
            role_store_address: roleStore.address,
            strict_bank_class_hash: strictBankClassHash,
            bank_class_hash: bankClassHash,
            role_module_class_hash: roleModuleClassHash,
        }
    );

    // -------------------------------------------------------------------------

    // Oracle change will lead to OrderHandler, DepositHandler, WithdrawalHandler, and ExchangeRouter change
    const oracle = await ensureDeployed(account, contracts.Oracle, "Oracle", {
        role_store_address: roleStore.address,
        oracle_store_address: oracleStore.address,
        pragma_address: pragmaAddress,
        role_module_class_hash: roleModuleClassHash,
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
        order_utils_class_hash: orderUtilsClassHash,
        increase_order_utils_class_hash: increaseOrderUtilsClassHash,
        decrease_order_utils_class_hash: decreaseOrderUtilsClassHash,
        swap_order_utils_class_hash: swapOrderUtilsClassHash,
        role_module_class_hash: roleModuleClassHash,
        base_order_handler_class_hash: baseOrderHandlerClassHash,
        market_utils_class_hash: marketUtilsClassHash,
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
            role_module_class_hash: roleModuleClassHash,
            market_utils_class_hash: marketUtilsClassHash,
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
            role_module_class_hash: roleModuleClassHash,
            market_utils_class_hash: marketUtilsClassHash,
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
            order_utils_class_hash: orderUtilsClassHash,
            increase_order_utils_class_hash: increaseOrderUtilsClassHash,
            decrease_order_utils_class_hash: decreaseOrderUtilsClassHash,
            swap_order_utils_class_hash: swapOrderUtilsClassHash,
            role_module_class_hash: roleModuleClassHash,
            base_order_handler_class_hash: baseOrderHandlerClassHash,
            market_utils_class_hash: marketUtilsClassHash,
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
        order_utils_class_hash: orderUtilsClassHash,
        increase_order_utils_class_hash: increaseOrderUtilsClassHash,
        decrease_order_utils_class_hash: decreaseOrderUtilsClassHash,
        swap_order_utils_class_hash: swapOrderUtilsClassHash,
        base_order_handler_class_hash: baseOrderHandlerClassHash,
        market_utils_class_hash: marketUtilsClassHash,
    });

    // -------------------------------------------------------------------------

    const exchangeRouter = await ensureDeployed(
        account,
        contracts.ExchangeRouter,
        "ExchangeRouter",
        {
            router_address: router.address,
            data_store_address: dataStore.address,
            event_emitter_address: eventEmitter.address,
            deposit_handler_address: depositHandler.address,
            withdrawal_handler_address: withdrawalHandler.address,
            order_handler_address: orderHandler.address,
            market_utils_class_hash: marketUtilsClassHash,
        }
    );

    // -------------------------------------------------------------------------

    const deployedContracts: Contracts = {
        Pragma: pragmaAddress,
        Reader: reader.address,
        RoleStore: roleStore.address,
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
        WolfyRole.CONTROLLER,
        WolfyRole.ORDER_KEEPER,
        WolfyRole.MARKET_KEEPER,
        WolfyRole.FROZEN_ORDER_KEEPER,
        WolfyRole.FEE_KEEPER,
        WolfyRole.CONFIG_KEEPER,
        WolfyRole.LIQUIDATION_KEEPER,
        WolfyRole.ADL_KEEPER,
        // WolfyRole.TIMELOCK_ADMIN
        // WolfyRole.TIMELOCK_MULTISIG
        // router plugin role is sus?
        WolfyRole.ROUTER_PLUGIN,
    ];

    // Grant roles to Account0 (deployment account)
    await grantRole(
        chainId,
        account,
        account.address,
        [WolfyRole.ROLE_ADMIN, ...ADMIN_ROLEs],
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

    // Grant roles to handlers
    await grantRole(
        chainId,
        account,
        depositHandlerAddress,
        WolfyRole.CONTROLLER,
        "DepositHandler"
    );
    await grantRole(
        chainId,
        account,
        withdrawalHandlerAddress,
        WolfyRole.CONTROLLER,
        "WithdrawalHandler"
    );
    await grantRole(chainId, account, swapHandlerAddress, WolfyRole.CONTROLLER, "SwapHandler");
    await grantRole(
        chainId,
        account,
        liquidationHandlerAddress,
        WolfyRole.CONTROLLER,
        "LiquidationHandler"
    );
    await grantRole(chainId, account, adlHandlerAddress, WolfyRole.CONTROLLER, "AdlHandler");
    await grantRole(
        chainId,
        account,
        orderHandlerAddress,
        [
            WolfyRole.CONTROLLER,
            // frozen keeper role is sus?
            WolfyRole.FROZEN_ORDER_KEEPER,
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
            WolfyRole.CONTROLLER,
            WolfyRole.ROUTER_PLUGIN,
            // Order keeper role is sus?
            WolfyRole.ORDER_KEEPER,
        ],
        "ExchangeRouter"
    );

    // -------------------------------------------------------------------------

    // Grant roles to market factory
    await grantRole(
        chainId,
        account,
        marketFactoryAddress,
        [WolfyRole.MARKET_KEEPER, WolfyRole.CONTROLLER],
        "MarketFactory"
    );

    // -------------------------------------------------------------------------

    console.log("All roles granted");
}

async function config() {
    const { account, chainId, feeToken } = await settingUp();

    const dataStoreContract = createWolfyContract(chainId, WolfyContract.DataStore, DataStoreABI);

    const configs = {
        ...GENERAL_CONFIGS,
        feeToken,
        feeReceiver: account.address,
        holdingAddress: account.address,
    };

    await executeAndWait(account, [
        createCall(dataStoreContract, "set_address", [dataStoreKeys.FEE_TOKEN, configs.feeToken]),
        createCall(dataStoreContract, "set_address", [
            dataStoreKeys.FEE_RECEIVER,
            configs.feeReceiver,
        ]),
        createCall(dataStoreContract, "set_address", [
            dataStoreKeys.HOLDING_ADDRESS,
            configs.holdingAddress,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.MAX_UI_FEE_FACTOR,
            configs.maxUiFeeFactor,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.MIN_HANDLE_EXECUTION_ERROR_GAS,
            configs.minHandleExecutionErrorGas,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.MAX_CALLBACK_GAS_LIMIT,
            configs.maxCallbackGasLimit,
        ]),
        createCall(dataStoreContract, "set_u256", [
            poseidonHash("MAX_SWAP_PATH_LENGTH"),
            configs.maxSwapPathLength,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.MIN_COLLATERAL_USD,
            configs.minCollateralUsd,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.MIN_POSITION_SIZE_USD,
            configs.minPositionSizeUsd,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.SWAP_FEE_RECEIVER_FACTOR,
            configs.swapFeeReceiverFactor,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.POSITION_FEE_RECEIVER_FACTOR,
            configs.positionFeeReceiverFactor,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.BORROWING_FEE_RECEIVER_FACTOR,
            configs.borrowingFeeReceiverFactor,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.CLAIMABLE_COLLATERAL_TIME_DIVISOR,
            configs.claimableCollateralTimeDivisor,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.depositGasLimitKey(true),
            configs.depositGasLimitSingle,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.depositGasLimitKey(false),
            configs.depositGasLimitMultiple,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.WITHDRAWAL_GAS_LIMIT,
            configs.withdrawalGasLimit,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.SINGLE_SWAP_GAS_LIMIT,
            configs.singleSwapGasLimit,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.INCREASE_ORDER_GAS_LIMIT,
            configs.increaseOrderGasLimit,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.DECREASE_ORDER_GAS_LIMIT,
            configs.decreaseOrderGasLimit,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.SWAP_ORDER_GAS_LIMIT,
            configs.swapOrderGasLimit,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.NATIVE_TOKEN_TRANSFER_GAS_LIMIT,
            configs.nativeTokenTransferGasLimit,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.ESTIMATED_GAS_FEE_BASE_AMOUNT,
            configs.estimatedGasFeeBaseAmount,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR,
            configs.estimatedGasFeeMultiplierFactor,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.EXECUTION_GAS_FEE_BASE_AMOUNT,
            configs.executionGasFeeBaseAmount,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.EXECUTION_GAS_FEE_MULTIPLIER_FACTOR,
            configs.executionGasFeeMultiplierFactor,
        ]),
        createCall(dataStoreContract, "set_bool", [
            dataStoreKeys.SKIP_BORROWING_FEE_FOR_SMALLER_SIDE,
            configs.skipBorrowingFeeForSmallerSide,
        ]),
        createCall(dataStoreContract, "set_u256", [
            dataStoreKeys.REQUEST_EXPIRATION_BLOCK_AGE,
            configs.requestExpirationBlockAge,
        ]),
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
