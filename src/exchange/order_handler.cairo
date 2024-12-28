//! Contract to handle creation, execution and cancellation of orders.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
// Local imports.
use freyr::oracle::oracle_utils::{SetPricesParams, SimulatePricesParams};
use freyr::order::{base_order_utils::CreateOrderParams, order::Order};
use starknet::ContractAddress;

// *************************************************************************
//                  Interface of the `OrderHandler` contract.
// *************************************************************************
#[starknet::interface]
trait IOrderHandler<TContractState> {
    /// Creates an order in the order store.
    /// # Arguments
    /// * `account` - The order's account.
    /// * `params` - The parameters used to create the order.
    /// # Returns
    /// The key of where the order is stored.
    fn create_order(ref self: TContractState, account: ContractAddress, params: CreateOrderParams) -> felt252;

    /// Updates the given order with the specified size delta, acceptable price, and trigger price.
    /// The `updateOrder()` feature must be enabled for the given order type. The caller must be the owner
    /// of the order, and the order must not be a market order. The size delta, trigger price, and
    /// acceptable price are updated on the order, and the order is unfrozen. Any additional FEE_TOKEN that is
    /// transferred to the contract is added to the order's execution fee. The updated order is then saved
    /// in the order store, and an `OrderUpdated` event is emitted.
    ///
    /// A user may be able to observe exchange prices and prevent order execution by updating the order's
    /// trigger price or acceptable price
    ///
    /// The main front-running concern is if a user knows whether the price is going to move up or down
    /// then positions accordingly, e.g. if price is going to move up then the user opens a long position
    ///
    /// With updating of orders, a user may know that price could be lower and delays the execution of an
    /// order by updating it, this should not be a significant front-running concern since it is similar
    /// to observing prices then creating a market order as price is decreasing
    /// # Arguments
    /// * `key` - The unique ID of the order to be updated.
    /// * `size_delta_usd` - The new size delta for the order.
    /// * `acceptable_price` - The new acceptable price for the order.
    /// * `trigger_price` - The new trigger price for the order.
    /// * `min_output_amount` - The minimum output amount for decrease orders and swaps.
    /// * `order` - The order to update that will be stored.
    /// # Returns
    /// The updated order.
    fn update_order(
        ref self: TContractState,
        key: felt252,
        size_delta_usd: u256,
        acceptable_price: u256,
        trigger_price: u256,
        min_output_amount: u256,
        order: Order
    ) -> Order;

    /// Cancels the given order. The `cancelOrder()` feature must be enabled for the given order
    /// type. The caller must be the owner of the order. The order is cancelled by calling the `cancelOrder()`
    /// function in the `OrderUtils` contract. This function also records the starting gas amount and the
    /// reason for cancellation, which is passed to the `cancelOrder()` function.
    /// # Arguments
    /// * `key` - The unique ID of the order to cancel.
    fn cancel_order(ref self: TContractState, key: felt252);

    /// Executes an order.
    /// # Arguments
    /// * `key` - The key of the order to execute.
    /// * `oracle_params` - The oracle params to set prices before execution.
    fn execute_order(ref self: TContractState, key: felt252, oracle_params: SetPricesParams);

    /// Simulates execution of an order to check for any error.
    /// # Arguments
    /// * `key` - The key of the order to execute.
    /// * `oracle_params` - The oracle params to simulate prices.
    fn simulate_execute_order(ref self: TContractState, key: felt252, params: SimulatePricesParams);

    /// Handle the error when executing an order, marking the order as frozen. This originally automatically called in a
    /// try/catch block, but cairo does not support try/catch so it is manually called by the keeper.
    /// # Arguments
    /// * `key` - The key of the order to execute.
    /// * `starting_gas` - The starting gas of the transaction.
    /// * `reason` - The reason of the error.
    /// * `reason_key` - The reason key of the error.
    fn handle_order_error(
        ref self: TContractState, key: felt252, starting_gas: u256, reason: felt252, reason_key: felt252
    );
}

#[starknet::contract]
mod OrderHandler {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use array::ArrayTrait;
    use core::starknet::SyscallResultTrait;
    use core::traits::Into;
    use debug::PrintTrait;
    use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use freyr::data::keys::{create_order_feature_disabled_key, execute_order_feature_disabled_key};
    use freyr::data::keys;
    use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use freyr::exchange::base_order_handler::{
        IBaseOrderHandler, BaseOrderHandler, IBaseOrderHandlerLibraryDispatcher, IBaseOrderHandlerDispatcherTrait
    };
    use freyr::exchange::exchange_utils;
    use freyr::feature::error::FeatureError;
    use freyr::feature::feature_utils::{validate_feature};
    use freyr::gas::gas_utils;
    use freyr::market::error::MarketError;
    use freyr::market::market_utils::{IMarketUtilsLibraryDispatcher, IMarketUtilsDispatcherTrait};
    use freyr::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
    use freyr::oracle::oracle_modules;

    use freyr::oracle::oracle_utils::{SetPricesParams, SimulatePricesParams};
    use freyr::oracle::oracle_utils;
    use freyr::oracle::{oracle::{IOracleDispatcher, IOracleDispatcherTrait},};
    use freyr::order::base_order_utils;
    use freyr::order::order_utils::IOrderUtilsDispatcherTrait;
    use freyr::order::{
        error::OrderError, order::{SecondaryOrderType, OrderType, Order, OrderTrait, DecreasePositionSwapType},
        order_vault::{IOrderVaultDispatcher, IOrderVaultDispatcherTrait},
        base_order_utils::{ExecuteOrderParams, ExecuteOrderParamsContracts}, order_utils::IOrderUtilsLibraryDispatcher,
        increase_order_utils::IIncreaseOrderUtilsLibraryDispatcher,
        decrease_order_utils::IDecreaseOrderUtilsLibraryDispatcher, swap_order_utils::ISwapOrderUtilsLibraryDispatcher
    };
    use freyr::order::{base_order_utils::CreateOrderParams, order_utils::{IOrderUtilsDispatcher},};
    use freyr::position::error::PositionError;
    use freyr::role::role::FROZEN_ORDER_KEEPER;
    use freyr::role::role;
    use freyr::role::role_module::{IRoleModuleLibraryDispatcher, IRoleModuleDispatcherTrait};
    use freyr::role::role_module::{RoleModule, IRoleModule};
    use freyr::role::role_store::{IRoleStoreDispatcher};
    use freyr::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
    use freyr::token::erc20::interface::{IERC20, IERC20Dispatcher, IERC20DispatcherTrait};
    use freyr::token::token_utils;
    use freyr::utils::error_utils;
    use freyr::utils::global_reentrancy_guard::{non_reentrant_before, non_reentrant_after};
    use starknet::ContractAddress;
    use starknet::contract_address_const;
    use starknet::{get_caller_address, get_contract_address, ClassHash};

    // Local imports.
    use super::IOrderHandler;

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
        increase_order_utils_lib: IIncreaseOrderUtilsLibraryDispatcher,
        decrease_order_utils_lib: IDecreaseOrderUtilsLibraryDispatcher,
        swap_order_utils_lib: ISwapOrderUtilsLibraryDispatcher,
        market_utils_lib: IMarketUtilsLibraryDispatcher,
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
                market_utils_class_hash
            );
        self.role_module.write(IRoleModuleLibraryDispatcher { class_hash: role_module_class_hash });
        self.role_module.read().initialize(role_store_address);
    }


    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl OrderHandlerImpl of super::IOrderHandler<ContractState> {
        fn create_order(ref self: ContractState, account: ContractAddress, params: CreateOrderParams) -> felt252 {
            // Check only order keeper
            self.role_module.read().only_order_keeper();

            // Fetch data store.
            let data_store = self.data_store.read();

            non_reentrant_before(data_store);

            // Validate feature and create order.
            validate_feature(data_store, create_order_feature_disabled_key(get_contract_address(), params.order_type));
            let key = self
                .order_utils_lib
                .read()
                .create_order_utils(
                    data_store,
                    self.event_emitter.read(),
                    self.order_vault.read(),
                    self.referral_storage.read(),
                    account,
                    params
                );

            non_reentrant_after(data_store);

            key
        }

        fn update_order(
            ref self: ContractState,
            key: felt252,
            size_delta_usd: u256,
            acceptable_price: u256,
            trigger_price: u256,
            min_output_amount: u256,
            order: Order
        ) -> Order {
            // Check only controller.
            self.role_module.read().only_controller();

            // Fetch data store.
            let data_store = self.data_store.read();
            let event_emitter = self.event_emitter.read();

            non_reentrant_before(data_store);

            // Validate feature.
            validate_feature(
                data_store, keys::update_order_feature_disabled_key(get_contract_address(), order.order_type)
            );

            assert(base_order_utils::is_market_order(order.order_type), 'OrderNotUpdatable');

            let mut updated_order = order.clone();
            updated_order.size_delta_usd = size_delta_usd;
            updated_order.trigger_price = trigger_price;
            updated_order.acceptable_price = acceptable_price;
            updated_order.min_output_amount = min_output_amount;
            updated_order.is_frozen = false;

            // Allow topping up of execution fee as frozen orders will have execution fee reduced.
            let fee_token = token_utils::fee_token(data_store);
            let order_vault = self.order_vault.read();
            let received_fee_token = order_vault.record_transfer_in(fee_token);
            updated_order.execution_fee = received_fee_token;

            let estimated_gas_limit = gas_utils::estimate_execute_order_gas_limit(data_store, @updated_order);
            gas_utils::validate_execution_fee(data_store, estimated_gas_limit, updated_order.execution_fee);

            updated_order.touch();

            base_order_utils::validate_non_empty_order(@updated_order);

            data_store.set_order(key, updated_order);
            event_emitter.emit_order_updated(key, size_delta_usd, acceptable_price, trigger_price, min_output_amount);

            non_reentrant_after(data_store);

            updated_order
        }

        fn cancel_order(ref self: ContractState, key: felt252) {
            let starting_gas: u256 = 0; // TODO: Get starting gas from Cairo.

            // Check only controller.
            self.role_module.read().only_controller();

            // Fetch data store.
            let data_store = self.data_store.read();

            non_reentrant_before(data_store);

            let order = data_store.get_order(key);

            // Validate feature.
            validate_feature(
                data_store, keys::cancel_order_feature_disabled_key(get_contract_address(), order.order_type)
            );

            if base_order_utils::is_market_order(order.order_type) {
                exchange_utils::validate_request_cancellation(data_store, order.updated_at_block, 'Order')
            }

            self
                .order_utils_lib
                .read()
                .cancel_order(
                    data_store,
                    self.event_emitter.read(),
                    self.order_vault.read(),
                    key,
                    order.account,
                    starting_gas,
                    keys::user_initiated_cancel(),
                    '',
                );

            non_reentrant_after(data_store);
        }


        /// Handles error from order.
        /// # Arguments
        /// * `key` - The key of the deposit to handle error for.
        /// * `starting_gas` - The starting gas of the transaction.
        /// * `reason` - The reason of the error.
        /// * `reason_key` - The reason key of the error.
        fn handle_order_error(
            ref self: ContractState, key: felt252, starting_gas: u256, reason: felt252, reason_key: felt252
        ) {
            // TODO: move this to private function and try/catch in execute_order when available
            let data_store = self.data_store.read();

            let order = data_store.get_order(key);
            let is_market_order = base_order_utils::is_market_order(order.order_type);

            if (oracle_utils::is_oracle_error(reason_key)
                || order.is_frozen
                || (!is_market_order && reason_key == PositionError::EMPTY_POSITION)
                || reason_key == OrderError::EMPTY_ORDER
                || reason_key == FeatureError::DISABLED_FEATURE
                || reason_key == OrderError::INVALID_KEEPER_FOR_FROZEN_ORDER
                || reason_key == OrderError::UNSUPPORTED_ORDER_TYPE
                || reason_key == OrderError::INVALID_ORDER_PRICES) {
                assert(false, reason_key)
            }

            let order_utils = self.order_utils_lib.read();

            if (is_market_order
                || reason_key == MarketError::INVALID_POSITION_MARKET
                || reason_key == MarketError::INVALID_COLLATERAL_TOKEN_FOR_MARKET
                || reason_key == PositionError::INVALID_POSITION_SIZE_VALUES) {
                order_utils
                    .cancel_order(
                        data_store,
                        self.event_emitter.read(),
                        self.order_vault.read(),
                        key,
                        order.account,
                        starting_gas,
                        reason,
                        reason_key,
                    );
                return ();
            }

            order_utils
                .freeze_order(
                    data_store,
                    self.event_emitter.read(),
                    self.order_vault.read(),
                    key,
                    get_caller_address(),
                    starting_gas,
                    reason,
                    reason_key
                );
        }

        fn execute_order(ref self: ContractState, key: felt252, oracle_params: SetPricesParams) {
            // Check only order keeper.
            self.role_module.read().only_order_keeper();

            // Fetch data store.
            let data_store = self.data_store.read();
            non_reentrant_before(data_store);
            oracle_modules::with_oracle_prices_before(
                self.oracle.read(), data_store, self.event_emitter.read(), @oracle_params
            );
            self._execute_order(key, oracle_params, get_contract_address());
            oracle_modules::with_oracle_prices_after(self.oracle.read());
            non_reentrant_after(data_store);
        }

        fn simulate_execute_order(ref self: ContractState, key: felt252, params: SimulatePricesParams) {
            // Check only order keeper.
            self.role_module.read().only_order_keeper();

            // Fetch data store.
            let data_store = self.data_store.read();

            non_reentrant_before(data_store);
            oracle_modules::with_simulated_oracle_prices_before(
                self.oracle.read(), params
            );

            let oracle_params: SetPricesParams = Default::default();
            self._execute_order(key, oracle_params, get_contract_address());

            oracle_modules::with_simulated_oracle_prices_after();
            non_reentrant_after(data_store);
        }
    }

    // ***********************************************a**************************
    //                          INTERNAL FUNCTIONS
    // *************************************************************************
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Executes an order.
        /// # Arguments
        /// * `key` - The key of the order to execute.
        /// * `oracle_params` - The oracle params to set prices before execution.
        /// * `keeper` - The keeper executing the order.
        fn _execute_order(self: @ContractState, key: felt252, oracle_params: SetPricesParams, keeper: ContractAddress) {
            let starting_gas: u256 = 100000; // TODO: Get starting gas from Cairo.

            let params = self
                .base_order_handler
                .read()
                .get_execute_order_params(key, oracle_params, keeper, starting_gas, SecondaryOrderType::None(()),);

            if params.order.is_frozen || params.order.order_type == OrderType::LimitSwap(()) {
                self._validate_state_frozen_order_keeper(keeper);
            }

            // Validate feature.
            validate_feature(
                params.contracts.data_store,
                execute_order_feature_disabled_key(get_contract_address(), params.order.order_type)
            );

            self.order_utils_lib.read().execute_order_utils(params);
        }


        /// Validate that the keeper is a frozen order keeper.
        /// # Arguments
        /// * `keeper` - address of the keeper.
        fn _validate_state_frozen_order_keeper(self: @ContractState, keeper: ContractAddress) {
            self.role_module.read().only_frozen_order_keeper();
        }
    }
}
