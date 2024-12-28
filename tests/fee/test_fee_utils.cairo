use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::data::keys::{claimable_fee_amount_key, claimable_ui_fee_amount_for_account_key, claimable_ui_fee_amount_key};

use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use freyr::fee::fee_utils::{increment_claimable_fee_amount, increment_claimable_ui_fee_amount};
use freyr::role::role;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::test_utils::tests_lib;
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::{ContractAddress, Felt252TryIntoContractAddress, contract_address_const, get_caller_address};

#[test]
fn given_normal_conditions_when_increment_claimable_fee_amount_then_works() {
    let (data_store, event_emitter) = setup();

    let market: ContractAddress = 0x555.try_into().unwrap();
    let token: ContractAddress = 0x666.try_into().unwrap();

    let key = claimable_fee_amount_key(market, token); // Calculate slot key to get initial value of slot.

    let initial_value = data_store.get_u256(key);
    assert(initial_value == 0_u256, 'initial value wrong');

    // Change value with util function.

    let delta = 50_u256;
    let fee_type = 'FEE_TYPE';

    increment_claimable_fee_amount(data_store, event_emitter, market, token, delta, fee_type);

    let final_value = data_store.get_u256(key);

    assert(final_value == delta, 'Final value wrong');
}

#[test]
fn given_normal_conditions_when_increment_claimable_ui_fee_amount_then_works() {
    let (data_store, event_emitter) = setup();

    let market: ContractAddress = 0x555.try_into().unwrap();
    let token: ContractAddress = 0x666.try_into().unwrap();
    let ui_fee_receiver: ContractAddress = 0x777.try_into().unwrap();

    let key = claimable_ui_fee_amount_for_account_key(market, token, ui_fee_receiver);
    let pool_key = claimable_ui_fee_amount_key(market, token);

    let initial_value = data_store.get_u256(key);
    let initial_pool_value = data_store.get_u256(pool_key);

    assert(initial_value == 0, 'Initial value wrong');
    assert(initial_pool_value == 0, 'Initial pool value wrong');

    let delta = 75_u256;
    let fee_type = 'UI_FEE_TYPE';

    increment_claimable_ui_fee_amount(data_store, event_emitter, ui_fee_receiver, market, token, delta, fee_type);

    let final_value = data_store.get_u256(key);
    let final_pool_value = data_store.get_u256(pool_key);

    assert(final_value == delta, 'Final value wrong');
    assert(final_pool_value == delta, 'Final pool value wrong');
}

/// Utility function to setup the test environment.
///
/// # Returns
///
/// * `ContractAddress` - The address of the caller.
/// * `IRoleStoreDispatcher` - The role store dispatcher.
/// * `IDataStoreDispatcher` - The data store dispatcher.
fn setup() -> (IDataStoreDispatcher, IEventEmitterDispatcher) {
    let (
        _caller_address,
        _market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        _role_module_class,
        _bank_class,
        _governable_class,
        _market_utils_class,
        _market_factory,
        _role_store,
        data_store,
        event_emitter,
        _exchange_router,
        _deposit_handler,
        _deposit_vault,
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
    ) =
        tests_lib::setup();

    (data_store, event_emitter)
}
