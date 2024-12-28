//! Contract to handle liquidation.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;

// Local imports.
use freyr::oracle::oracle_utils::SetPricesParams;
use starknet::{ClassHash, ContractAddress};

// *************************************************************************
//                  Interface of the `LiquidationHandler` contract.
// *************************************************************************
#[starknet::interface]
trait ILiquidationHandler<TContractState> {
    /// Executes a position liquidation.
    /// # Arguments
    /// * `account` - The account of the position to liquidate.
    /// * `market` - The position's market.
    /// * `collateral_token` - The position's collateralToken.
    /// * `is_long` - Whether the position is long or short.
    /// * `oracle_params` - The oracle params to set prices before execution.
    fn execute_liquidation(
        ref self: TContractState,
        account: ContractAddress,
        market: ContractAddress,
        collateral_token: ContractAddress,
        is_long: bool,
        oracle_params: SetPricesParams,
    );
}

#[starknet::contract]
mod LiquidationHandler {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.

    use freyr::data::{
        data_store::{DataStore, IDataStoreSafeDispatcher, IDataStoreSafeDispatcherTrait},
        keys::execute_order_feature_disabled_key,
    };
    use freyr::data::{data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait}, keys};
    use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use freyr::exchange::base_order_handler::{IBaseOrderHandlerDispatcherTrait, IBaseOrderHandlerLibraryDispatcher};
    use freyr::feature::feature_utils::validate_feature;

    use freyr::liquidation::liquidation_utils::create_liquidation_order;
    use freyr::market::market::Market;
    use freyr::market::market_utils::{IMarketUtilsDispatcherTrait, IMarketUtilsLibraryDispatcher};
    use freyr::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
    use freyr::oracle::{
        oracle::{IOracleDispatcher, IOracleDispatcherTrait},
        oracle_modules::{with_oracle_prices_after, with_oracle_prices_before}, oracle_utils::SetPricesParams,
    };
    use freyr::order::{
        base_order_utils::{ExecuteOrderParams}, order::{Order, OrderType, SecondaryOrderType},
        order_utils::{IOrderUtilsDispatcher}, order_vault::{IOrderVaultDispatcher, IOrderVaultDispatcherTrait},
    };
    use freyr::order::{order_utils::{IOrderUtilsDispatcherTrait, IOrderUtilsLibraryDispatcher}};
    use freyr::role::role;
    use freyr::role::role_module::{IRoleModule, RoleModule};
    use freyr::role::role_module::{IRoleModuleDispatcherTrait, IRoleModuleLibraryDispatcher};
    use freyr::role::role_store::{IRoleStoreDispatcher};
    use freyr::role::role_store::{IRoleStoreSafeDispatcher, IRoleStoreSafeDispatcherTrait};
    use freyr::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
    use freyr::utils::{global_reentrancy_guard, starknet_utils};

    use starknet::storage::{
        StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ClassHash, ContractAddress, get_caller_address, get_contract_address};

    // Local imports.
    use super::ILiquidationHandler;

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        role_module: IRoleModuleLibraryDispatcher,
        base_order_handler: IBaseOrderHandlerLibraryDispatcher,
        // BaseOrderHandler storage
        data_store: IDataStoreDispatcher,
        role_store: IRoleStoreDispatcher,
        event_emitter: IEventEmitterDispatcher,
        order_vault: IOrderVaultDispatcher,
        swap_handler: ISwapHandlerDispatcher,
        oracle: IOracleDispatcher,
        referral_storage: IReferralStorageDispatcher,
        order_utils_lib: IOrderUtilsLibraryDispatcher,
        // increase_order_utils_lib: IIncreaseOrderUtilsLibraryDispatcher,
        // decrease_order_utils_lib: IDecreaseOrderUtilsLibraryDispatcher,
        // swap_order_utils_lib: ISwapOrderUtilsLibraryDispatcher
        market_utils: IMarketUtilsLibraryDispatcher,
    }

    // *************************************************************************
    //                              CONSTRUCTOR
    // *************************************************************************

    /// Constructor of the contract.
    /// # Arguments
    /// * `data_store_address` - The address of the `DataStore` contract.
    /// * `role_store_address` - The address of the `RoleStore` contract.
    /// * `event_emitter_address` - The address of the EventEmitter contract.
    /// * `order_vault_address` - The address of the `OrderVault` contract.
    /// * `oracle_address` - The address of the `Oracle` contract.
    /// * `swap_handler_address` - The address of the `SwapHandler` contract.
    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        role_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
        order_vault_address: ContractAddress,
        oracle_address: ContractAddress,
        swap_handler_address: ContractAddress,
        referral_storage_address: ContractAddress,
        order_utils_class_hash: ClassHash,
        increase_order_utils_class_hash: ClassHash,
        decrease_order_utils_class_hash: ClassHash,
        swap_order_utils_class_hash: ClassHash,
        role_module_class_hash: ClassHash,
        base_order_handler_class_hash: ClassHash,
        market_utils_class_hash: ClassHash,
    ) {
        self.base_order_handler.write(IBaseOrderHandlerLibraryDispatcher { class_hash: base_order_handler_class_hash });
        self
            .base_order_handler
            .read()
            .initialize(
                data_store_address,
                event_emitter_address,
                order_vault_address,
                oracle_address,
                swap_handler_address,
                referral_storage_address,
                order_utils_class_hash,
                increase_order_utils_class_hash,
                decrease_order_utils_class_hash,
                swap_order_utils_class_hash,
                market_utils_class_hash,
            );
        self.role_module.write(IRoleModuleLibraryDispatcher { class_hash: role_module_class_hash });
        self.role_module.read().initialize(role_store_address);
    }


    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl LiquidationHandlerImpl of super::ILiquidationHandler<ContractState> { // executes a position liquidation
        fn execute_liquidation(
            ref self: ContractState,
            account: ContractAddress,
            market: ContractAddress,
            collateral_token: ContractAddress,
            is_long: bool,
            oracle_params: SetPricesParams,
        ) {
            global_reentrancy_guard::non_reentrant_before(self.data_store.read());

            self.role_module.read().only_liquidation_keeper();

            with_oracle_prices_before(
                self.oracle.read(), self.data_store.read(), self.event_emitter.read(), @oracle_params,
            );

            // let starting_gas: u128 = starknet_utils::sn_gasleft(array![100]); TODO GAS
            let starting_gas: u256 = 0;

            let key: felt252 = create_liquidation_order(
                self.data_store.read(), self.event_emitter.read(), account, market, collateral_token, is_long,
            );
            let tmp_oracle_params: SetPricesParams = oracle_params.clone();
            let params: ExecuteOrderParams = self
                .base_order_handler
                .read()
                .get_execute_order_params(
                    key, tmp_oracle_params, get_caller_address(), starting_gas, SecondaryOrderType::None,
                );
            validate_feature(
                params.contracts.data_store,
                execute_order_feature_disabled_key(get_contract_address(), params.order.order_type),
            );
            self.order_utils_lib.read().execute_order_utils(params);
            with_oracle_prices_after(self.oracle.read());

            global_reentrancy_guard::non_reentrant_after(self.data_store.read());
        }
    }
}
