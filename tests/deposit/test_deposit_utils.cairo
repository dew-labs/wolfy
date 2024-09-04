//! Test file for `src/deposit/deposit_utils.cairo`.
use starknet::{ContractAddress, contract_address_const};

use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::data::keys;
use satoru::market::market::Market;
use satoru::role::role;
use satoru::test_utils::tests_lib;
use satoru::utils::span32::{Span32, Array32Trait};
use satoru::deposit::{
    deposit::Deposit, deposit_utils::CreateDepositParams, deposit_utils::create_deposit, deposit_utils::cancel_deposit,
    deposit_vault::{IDepositVaultDispatcher, IDepositVaultDispatcherTrait}
};


use snforge_std::{declare, start_cheat_caller_address, ContractClassTrait, DeclareResultTrait};


#[test]
fn given_normal_conditions_when_deposit_then_works() {
    let (_caller_address, data_store, _role_store, event_emitter, deposit_vault) = setup();
    let account = tests_lib::deploy_mock_account();
    let deposit_param = create_dummy_deposit_param();
    let _key = create_deposit(data_store, event_emitter, deposit_vault, account, deposit_param);
}

#[test]
#[should_panic(expected: ('insufficient_execution_fee',))]
fn given_unsufficient_fee_token_amount_for_deposit_then_fails() {
    let (_caller_address, data_store, role_store, event_emitter, deposit_vault) = setup();
    let account = tests_lib::deploy_mock_account();
    let deposit_param = create_dummy_deposit_param_market(data_store, role_store);
    let _key = create_deposit(data_store, event_emitter, deposit_vault, account, deposit_param);
}

#[test]
#[should_panic(expected: ('empty_deposit_amounts',))]
fn given_empty_deposit_amount_then_fails() {
    let (_caller_address, data_store, _role_store, event_emitter, deposit_vault) = setup();
    let account = tests_lib::deploy_mock_account();
    let deposit_param = create_dummy_deposit_param();
    let _key = create_deposit(data_store, event_emitter, deposit_vault, account, deposit_param);
}

#[test]
fn given_normal_conditions_when_cancel_deposit_then_works() {
    let (_caller_address, data_store, _role_store, event_emitter, deposit_vault) = setup();
    let account: ContractAddress = 'account'.try_into().unwrap();
    let keeper: ContractAddress = 'keeper'.try_into().unwrap();
    // TODO: create real market instead of dummy
    let deposit_param = create_dummy_deposit_param();
    let _key = 'key';
    let reason = 'key';
    let starting_gas = 2;
    let reason_bytes = array!['reason_bytes_1', 'reason_bytes_2',];
    let key = create_deposit(data_store, event_emitter, deposit_vault, account, deposit_param);

    cancel_deposit(data_store, event_emitter, deposit_vault, key, keeper, starting_gas, reason, reason_bytes);
}


/// Utility function to setup the test environment.
fn setup() -> (
    ContractAddress, IDataStoreDispatcher, IRoleStoreDispatcher, IEventEmitterDispatcher, IDepositVaultDispatcher
) {
    let (
        caller_address,
        _market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        _role_module_class,
        _bank_class,
        _governable_class,
        _market_factory,
        role_store,
        data_store,
        event_emitter,
        _exchange_router,
        _deposit_handler,
        deposit_vault,
        _oracle,
        _order_handler,
        _order_vault,
        _reader,
        _referal_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        _,
        _,
        _,
        _,
    ) =
        tests_lib::setup();

    (caller_address, data_store, role_store, event_emitter, deposit_vault)
}

fn create_dummy_deposit_param() -> CreateDepositParams {
    CreateDepositParams {
        /// The address to send the market tokens to.
        receiver: 'receiver'.try_into().unwrap(),
        /// The callback contract linked to this deposit.
        callback_contract: 'callback_contract'.try_into().unwrap(),
        /// The ui fee receiver.
        ui_fee_receiver: 'ui_fee_receiver'.try_into().unwrap(),
        /// The market to deposit into.
        market: 'market'.try_into().unwrap(),
        /// The initial long token address.
        initial_long_token: 'initial_long_token'.try_into().unwrap(),
        /// The initial short token address.
        initial_short_token: 'initial_short_token'.try_into().unwrap(),
        /// The swap path into markets for the long token.
        long_token_swap_path: array![].span32(),
        /// The swap path into markets for the short token.
        short_token_swap_path: array![].span32(),
        /// The minimum acceptable number of liquidity tokens.
        min_market_tokens: 10,
        /// The execution fee for keepers.
        execution_fee: 1,
        /// The gas limit for the callback_contract.
        callback_gas_limit: 20
    }
}

fn create_dummy_deposit_param_market(
    data_store: IDataStoreDispatcher, role_store: IRoleStoreDispatcher
) -> CreateDepositParams {
    let key: ContractAddress = 12345.try_into().unwrap();
    let address_zero: ContractAddress = 42.try_into().unwrap();
    let caller_address: ContractAddress = tests_lib::get_c4ller_address();
    let mut market = Market {
        market_token: key, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };
    // Test logic
    // Test set_market function without permission
    start_cheat_caller_address(role_store.contract_address, caller_address);
    start_cheat_caller_address(data_store.contract_address, caller_address);
    data_store.set_market(key, 0, market);

    CreateDepositParams {
        /// The address to send the market tokens to.
        receiver: 'receiver'.try_into().unwrap(),
        /// The callback contract linked to this deposit.
        callback_contract: 'callback_contract'.try_into().unwrap(),
        /// The ui fee receiver.
        ui_fee_receiver: 'ui_fee_receiver'.try_into().unwrap(),
        /// The market to deposit into.
        market: market.market_token,
        /// The initial long token address.
        initial_long_token: 'initial_long_token'.try_into().unwrap(),
        /// The initial short token address.
        initial_short_token: 'initial_short_token'.try_into().unwrap(),
        /// The swap path into markets for the long token.
        long_token_swap_path: array![].span32(),
        /// The swap path into markets for the short token.
        short_token_swap_path: array![].span32(),
        /// The minimum acceptable number of liquidity tokens.
        min_market_tokens: 10,
        /// The execution fee for keepers.
        execution_fee: 1,
        /// The gas limit for the callback_contract.
        callback_gas_limit: 20
    }
}
