//! Contract to handle adl.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;

// Local imports.
use freyr::oracle::oracle_utils::SetPricesParams;
use freyr::utils::i256::i256;
use starknet::ContractAddress;


// *************************************************************************
//                  Interface of the `AdlHandler` contract.
// *************************************************************************
#[starknet::interface]
trait IAdlHandler<TContractState> {
    /// Checks the ADL state to update the isAdlEnabled flag.
    /// # Arguments
    /// * `market` - The market to check.
    /// * `is_long` - Whether to check long or short side.
    /// * `oracle_params` - The oracle set price parameters used to set price
    /// before performing checks
    fn update_adl_state(
        ref self: TContractState, market: ContractAddress, is_long: bool, oracle_params: SetPricesParams
    );

    /// Auto-deleverages a position.
    /// There is no validation that ADL is executed in order of position profit
    /// or position size, this is due to the limitation of the gas overhead
    /// required to check this ordering.
    ///
    /// ADL keepers could be separately incentivised using a rebate based on
    /// position profit, this is not implemented within the contracts at the moment.
    /// # Arguments
    /// * `market` - The market to check.
    /// * `is_long` - Whether to check long or short side.
    /// * `oracle_params` - The oracle set price parameters used to set price
    /// before performing adl.
    fn execute_adl(
        ref self: TContractState,
        account: ContractAddress,
        market_address: ContractAddress,
        collateral_token: ContractAddress,
        is_long: bool,
        size_delta_usd: u256,
        oracle_params: SetPricesParams
    );
}

#[starknet::contract]
mod AdlHandler {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use freyr::adl::adl_utils;
    use freyr::data::{keys, data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait}};
    use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use freyr::exchange::base_order_handler::{IBaseOrderHandlerLibraryDispatcher, IBaseOrderHandlerDispatcherTrait};
    use freyr::feature::feature_utils;
    use freyr::market::market_utils::{IMarketUtilsLibraryDispatcher, IMarketUtilsDispatcherTrait};
    use freyr::market::{market::Market, market_utils};
    use freyr::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
    use freyr::oracle::oracle_utils::SetPricesParams;

    use freyr::oracle::{
        oracle::{IOracleDispatcher, IOracleDispatcherTrait},
        oracle_modules::{with_oracle_prices_before, with_oracle_prices_after}, oracle_utils
    };
    use freyr::order::{
        order::{SecondaryOrderType, OrderType, Order}, order_vault::{IOrderVaultDispatcher, IOrderVaultDispatcherTrait},
        base_order_utils::{ExecuteOrderParams}, order_utils::{IOrderUtilsLibraryDispatcher, IOrderUtilsDispatcherTrait},
    };
    use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
    use freyr::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
    use freyr::utils::i256::i256;
    use freyr::utils::{store_arrays::StoreU64Array, calc::to_signed};
    use starknet::{ContractAddress, get_caller_address, get_contract_address, SyscallResultTrait, ClassHash};


    // Local imports.
    use super::IAdlHandler;


    /// ExecuteAdlCache struct used in execute_adl.
    #[derive(Drop, Serde)]
    struct ExecuteAdlCache {
        /// The starting gas to execute adl.
        starting_gas: u256,
        /// The min oracles block numbers.
        min_oracle_block_numbers: Array<u64>,
        /// The max oracles block numbers.
        max_oracle_block_numbers: Array<u64>,
        /// The key of the adl to execute.
        key: felt252,
        /// Whether adl should be allowed, depending on pnl state.
        should_allow_adl: bool,
        /// The maximum pnl factor to allow adl.
        max_pnl_factor_for_adl: u256,
        /// The factor between pnl and pool.
        pnl_to_pool_factor: i256,
        /// The new factor between pnl and pool.
        next_pnl_to_pool_factor: i256,
        /// The minimal pnl factor for adl.
        min_pnl_factor_for_adl: u256
    }

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
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
        base_order_handler_class_hash: ClassHash,
        market_utils_class_hash: ClassHash
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
    }

    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl AdlHandlerImpl of super::IAdlHandler<ContractState> {
        fn update_adl_state(
            ref self: ContractState, market: ContractAddress, is_long: bool, oracle_params: SetPricesParams
        ) {
            let max_oracle_block_numbers = oracle_utils::get_uncompacted_oracle_block_numbers(
                oracle_params.compacted_max_oracle_block_numbers.span(), oracle_params.tokens.len().into()
            );
            adl_utils::update_adl_state(
                self.data_store.read(),
                self.event_emitter.read(),
                self.oracle.read(),
                market,
                is_long,
                max_oracle_block_numbers.span(),
                self.market_utils.read(),
            );
        }

        fn execute_adl(
            ref self: ContractState,
            account: ContractAddress,
            market_address: ContractAddress,
            collateral_token: ContractAddress,
            is_long: bool,
            size_delta_usd: u256,
            oracle_params: oracle_utils::SetPricesParams
        ) {
            let mut cache = ExecuteAdlCache {
                starting_gas: 0,
                min_oracle_block_numbers: array![],
                max_oracle_block_numbers: array![],
                key: 0,
                should_allow_adl: false,
                max_pnl_factor_for_adl: 0,
                pnl_to_pool_factor: Zeroable::zero(),
                next_pnl_to_pool_factor: Zeroable::zero(),
                min_pnl_factor_for_adl: 0
            };

            cache
                .min_oracle_block_numbers =
                    oracle_utils::get_uncompacted_oracle_block_numbers(
                        oracle_params.compacted_min_oracle_block_numbers.span(), oracle_params.tokens.len().into()
                    );

            cache
                .max_oracle_block_numbers =
                    oracle_utils::get_uncompacted_oracle_block_numbers(
                        oracle_params.compacted_min_oracle_block_numbers.span(), oracle_params.tokens.len().into()
                    );

            let data_store = self.data_store.read();
            let oracle = self.oracle.read();

            adl_utils::validate_adl(data_store, market_address, is_long, cache.max_oracle_block_numbers.span());

            let market_utils = self.market_utils.read();

            let (should_allow_adl, pnl_to_pool_factor, max_pnl_factor_for_adl) = market_utils
                .is_pnl_factor_exceeded(data_store, oracle, market_address, is_long, keys::max_pnl_factor_for_adl());
            cache.should_allow_adl = should_allow_adl;
            cache.pnl_to_pool_factor = pnl_to_pool_factor;
            cache.max_pnl_factor_for_adl = max_pnl_factor_for_adl;

            assert(cache.should_allow_adl, 'adl not required');

            cache
                .key =
                    adl_utils::create_adl_order(
                        adl_utils::CreateAdlOrderParams {
                            data_store,
                            event_emitter: self.event_emitter.read(),
                            account,
                            market: market_address,
                            collateral_token,
                            is_long,
                            size_delta_usd,
                            updated_at_block: (*cache.min_oracle_block_numbers.at(0))
                        }
                    );

            let params: ExecuteOrderParams = self
                .base_order_handler
                .read()
                .get_execute_order_params(
                    cache.key, oracle_params, get_caller_address(), cache.starting_gas, SecondaryOrderType::Adl(())
                );

            // let order_type: felt252 = params.order.order_type.into();
            feature_utils::validate_feature(
                params.contracts.data_store,
                keys::execute_adl_feature_disabled_key(get_contract_address(), params.order.order_type.into())
            );

            self.order_utils_lib.read().execute_order_utils(params);

            // validate that the ratio of pending pnl to pool value was decreased
            cache
                .next_pnl_to_pool_factor = market_utils
                .get_pnl_to_pool_factor(data_store, oracle, market_address, is_long, true);
            assert(cache.next_pnl_to_pool_factor >= cache.pnl_to_pool_factor, 'invalid adl');

            cache
                .min_pnl_factor_for_adl = market_utils
                .get_min_pnl_factor_after_adl(data_store, market_address, is_long);
            assert(cache.next_pnl_to_pool_factor > to_signed(cache.min_pnl_factor_for_adl, true), 'pnl overcorrected');
        }
    }
}

