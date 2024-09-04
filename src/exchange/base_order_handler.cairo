//! Base contract for shared order handler functions.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;
use starknet::{ContractAddress, contract_address_const, ClassHash};

use satoru::oracle::oracle_utils::SetPricesParams;
use satoru::order::{order::SecondaryOrderType, base_order_utils::ExecuteOrderParams};

// *************************************************************************
//                  Interface of the `BaseOrderHandler` contract.
// *************************************************************************
#[starknet::interface]
trait IBaseOrderHandler<TContractState> {
    fn initialize(
        ref self: TContractState,
        data_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
        order_vault_address: ContractAddress,
        oracle_address: ContractAddress,
        swap_handler_address: ContractAddress,
        referral_storage_address: ContractAddress,
        order_utils_class_hash: ClassHash,
        increase_order_utils_class_hash: ClassHash,
        decrease_order_utils_class_hash: ClassHash,
        swap_order_utils_class_hash: ClassHash,
    );

    fn get_execute_order_params(
        ref self: TContractState,
        key: felt252,
        oracle_params: SetPricesParams,
        keeper: ContractAddress,
        starting_gas: u256,
        secondary_order_type: SecondaryOrderType
    ) -> ExecuteOrderParams;
}

#[starknet::contract]
mod BaseOrderHandler {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use core::option::OptionTrait;
    use core::zeroable::Zeroable;
    use core::traits::Into;
    use starknet::{get_caller_address, ContractAddress, contract_address_const, ClassHash};

    use result::ResultTrait;

    // Local imports.
    use super::IBaseOrderHandler;
    use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
    use satoru::role::role_module::{IRoleModuleDispatcher, IRoleModuleDispatcherTrait, RoleModule, IRoleModule};

    use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use satoru::oracle::{
        oracle::{IOracleDispatcher, IOracleDispatcherTrait},
        oracle_modules::{with_oracle_prices_before, with_oracle_prices_after},
        oracle_utils::{SetPricesParams, get_uncompacted_oracle_block_numbers},
    };
    use satoru::order::{
        error::OrderError, order::{SecondaryOrderType, OrderType, Order, DecreasePositionSwapType},
        order_vault::{IOrderVaultDispatcher, IOrderVaultDispatcherTrait},
        base_order_utils::{ExecuteOrderParams, ExecuteOrderParamsContracts}, order_utils::IOrderUtilsLibraryDispatcher,
        increase_order_utils::IIncreaseOrderUtilsLibraryDispatcher,
        decrease_order_utils::IDecreaseOrderUtilsLibraryDispatcher, swap_order_utils::ISwapOrderUtilsLibraryDispatcher
    };
    use satoru::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
    use satoru::exchange::error::ExchangeError;
    use satoru::market::{market::Market, market_utils};
    use satoru::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
    use satoru::utils::span32::Array32Trait;

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    pub struct Storage {
        /// Interface to interact with the `DataStore` contract.
        pub data_store: IDataStoreDispatcher,
        /// Interface to interact with the `RoleStore` contract.
        pub role_store: IRoleStoreDispatcher,
        /// Interface to interact with the `EventEmitter` contract.
        pub event_emitter: IEventEmitterDispatcher,
        /// Interface to interact with the `OrderVault` contract.
        pub order_vault: IOrderVaultDispatcher,
        /// Interface to interact with the `SwapHandler` contract.
        pub swap_handler: ISwapHandlerDispatcher,
        /// Interface to interact with the `Oracle` contract.
        pub oracle: IOracleDispatcher,
        /// Interface to interact with the `ReferralStorage` contract.
        pub referral_storage: IReferralStorageDispatcher,
        /// Interface to interact with the `OrderUtils` lib.
        pub order_utils_lib: IOrderUtilsLibraryDispatcher,
        /// Interface to interact with the `IncreaseOrderUtils` lib.
        pub increase_order_utils_lib: IIncreaseOrderUtilsLibraryDispatcher,
        /// Interface to interact with the `DecreaseOrderUtils` lib.
        pub decrease_order_utils_lib: IDecreaseOrderUtilsLibraryDispatcher,
        /// Interface to interact with the `SwapOrderUtils` lib.
        pub swap_order_utils_lib: ISwapOrderUtilsLibraryDispatcher
    }

    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl BaseOrderHandlerImpl of super::IBaseOrderHandler<ContractState> {
        fn initialize(
            ref self: ContractState,
            data_store_address: ContractAddress,
            event_emitter_address: ContractAddress,
            order_vault_address: ContractAddress,
            oracle_address: ContractAddress,
            swap_handler_address: ContractAddress,
            referral_storage_address: ContractAddress,
            order_utils_class_hash: ClassHash,
            increase_order_utils_class_hash: ClassHash,
            decrease_order_utils_class_hash: ClassHash,
            swap_order_utils_class_hash: ClassHash,
        ) {
            // Make sure the contract is not already initialized.
            assert(self.data_store.read().contract_address.is_zero(), ExchangeError::ALREADY_INITIALIZED);
            self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
            self.event_emitter.write(IEventEmitterDispatcher { contract_address: event_emitter_address });
            self.order_vault.write(IOrderVaultDispatcher { contract_address: order_vault_address });
            self.oracle.write(IOracleDispatcher { contract_address: oracle_address });
            self.swap_handler.write(ISwapHandlerDispatcher { contract_address: swap_handler_address });
            self.referral_storage.write(IReferralStorageDispatcher { contract_address: referral_storage_address });
            self.order_utils_lib.write(IOrderUtilsLibraryDispatcher { class_hash: order_utils_class_hash });
            self
                .increase_order_utils_lib
                .write(IIncreaseOrderUtilsLibraryDispatcher { class_hash: increase_order_utils_class_hash });
            self
                .decrease_order_utils_lib
                .write(IDecreaseOrderUtilsLibraryDispatcher { class_hash: decrease_order_utils_class_hash });
            self
                .swap_order_utils_lib
                .write(ISwapOrderUtilsLibraryDispatcher { class_hash: swap_order_utils_class_hash });
        }

        fn get_execute_order_params(
            ref self: ContractState,
            key: felt252,
            oracle_params: SetPricesParams,
            keeper: ContractAddress,
            starting_gas: u256,
            secondary_order_type: SecondaryOrderType
        ) -> ExecuteOrderParams {
            let data_store = self.data_store.read();

            let order = data_store.get_order(key);

            let swap_path_markets = market_utils::get_swap_path_markets(data_store, order.swap_path);

            let execute_order_params_contract = ExecuteOrderParamsContracts {
                data_store: data_store,
                event_emitter: self.event_emitter.read(),
                order_vault: self.order_vault.read(),
                oracle: self.oracle.read(),
                swap_handler: self.swap_handler.read(),
                referral_storage: self.referral_storage.read(),
            };

            let min_oracle_block_numbers = get_uncompacted_oracle_block_numbers(
                oracle_params.compacted_min_oracle_block_numbers.span(), oracle_params.tokens.len()
            );
            let max_oracle_block_numbers = get_uncompacted_oracle_block_numbers(
                oracle_params.compacted_max_oracle_block_numbers.span(), oracle_params.tokens.len()
            );

            let address_zero = contract_address_const::<0>();

            let mut market = Default::default();

            if (order.market != address_zero) {
                market = market_utils::get_enabled_market(data_store, order.market);
            }

            ExecuteOrderParams {
                contracts: execute_order_params_contract,
                key: key,
                order: order,
                swap_path_markets: swap_path_markets,
                min_oracle_block_numbers: min_oracle_block_numbers,
                max_oracle_block_numbers: max_oracle_block_numbers,
                market: market,
                keeper: keeper,
                starting_gas: starting_gas,
                secondary_order_type: secondary_order_type
            }
        }
    }
}
