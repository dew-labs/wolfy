// Core libe imports.
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const};

// Local imports.
use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::event::event_emitter::{EventEmitter, IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::role::role;
use satoru::order::order::{Order, OrderType, OrderTrait, DecreasePositionSwapType};
use satoru::test_utils::tests_lib;
use satoru::position::position::{Position};

use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait, spy_events, EventSpy,
    EventSpyAssertionsTrait, Event, EventSpyTrait, start_mock_call
};
use satoru::adl::adl_utils;
use satoru::utils::i256::{i256, i256_new};
use satoru::market::market::{Market};
use satoru::price::price::{Price, PriceTrait};
use satoru::oracle::oracle::{IOracleDispatcher, IOracleDispatcherTrait};

#[test]
fn given_normal_conditions_when_set_latest_adl_block_then_works() {
    // Setup
    let (_caller_address, _role_store, data_store, _, _) = setup();
    let market = 'market'.try_into().unwrap();
    let is_long = false;

    // Test logic
    // Default should return 0
    let latest_block = adl_utils::get_latest_adl_block(data_store, market, is_long);
    assert(latest_block == 0, 'Invalid lates_block');

    // Set block value
    let block_value = 1234_u64;
    adl_utils::set_latest_adl_block(data_store, market, is_long, block_value);

    let latest_block_after = adl_utils::get_latest_adl_block(data_store, market, is_long);
    assert(latest_block_after == block_value, 'Invalid lates_block2');

    // Update block value
    let block_value2 = 222222_u64;
    adl_utils::set_latest_adl_block(data_store, market, is_long, block_value2);

    let block_updated = adl_utils::get_latest_adl_block(data_store, market, is_long);
    assert(block_updated == block_value2, 'Invalid lates_block3');

    // For different parameter block shouldnt change
    let is_long2 = true;
    let block_default = adl_utils::get_latest_adl_block(data_store, market, is_long2);
    assert(block_default == 0, 'Invalid lates_block4');

    tests_lib::teardown();
}


#[test]
fn given_normal_conditions_when_set_adl_enabled_then_works() {
    // Setup
    let (_caller_address, _role_store, data_store, _, _) = setup();
    let market = 'market'.try_into().unwrap();
    let is_long = false;

    // Test logic
    // Default should return false
    let is_enabled = adl_utils::get_is_adl_enabled(data_store, market, is_long);
    assert(!is_enabled, 'Invalid enabled result');

    let enabled_value = true;
    adl_utils::set_adl_enabled(data_store, market, is_long, enabled_value);

    let is_enabled_after = adl_utils::get_is_adl_enabled(data_store, market, is_long);
    assert(is_enabled_after == enabled_value, 'Invalid enabled result2');

    tests_lib::teardown();
}


#[test]
#[should_panic(expected: ('adl_not_enabled',))]
fn given_not_enabled_condition_when_validate_adl_then_fails() {
    // Setup
    let (_caller_address, _role_store, data_store, _, _) = setup();
    let market = 'market'.try_into().unwrap();
    let block_numbers = array![10_u64, 8_u64];
    // Test logic
    adl_utils::validate_adl(data_store, market, false, block_numbers.span());

    tests_lib::teardown();
}


#[test]
#[should_panic(expected: ('block_no_smaller_than_required',))]
fn given_small_block_number_when_validate_adl_then_fails() {
    // Setup
    let (_caller_address, _role_store, data_store, _, _) = setup();
    let market = 'market'.try_into().unwrap();
    let is_long = false;

    // Test logic
    let enabled_value = true;
    adl_utils::set_adl_enabled(data_store, market, is_long, enabled_value);

    let block_value = 1234_u64;
    adl_utils::set_latest_adl_block(data_store, market, is_long, block_value);

    let block_numbers = array![10_u64, 11_u64];
    adl_utils::validate_adl(data_store, market, is_long, block_numbers.span());

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_validate_adl_then_works() {
    // Setup
    let (_caller_address, _role_store, data_store, _, _) = setup();
    let market = 'market'.try_into().unwrap();
    let is_long = false;

    // Test logic
    let enabled_value = true;
    adl_utils::set_adl_enabled(data_store, market, is_long, enabled_value);

    let block_value = 1234_u64;
    adl_utils::set_latest_adl_block(data_store, market, is_long, block_value);

    let block_numbers = array![11111111_u64, 12111111_u64];
    adl_utils::validate_adl(data_store, market, is_long, block_numbers.span());

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_emit_adl_state_updated_then_works() {
    // Setup
    let (caller_address, _role_store, _data_store, event_emitter, _) = setup();
    let mut spy = spy_events();
    let market: ContractAddress = 'market'.try_into().unwrap();
    let is_long = true;
    let pnl_to_pool_factor: i256 = i256_new(12345, false);
    let max_pnl_factor: u256 = 100;
    let should_enable_adl: bool = true;

    // Emit event
    start_cheat_caller_address(event_emitter.contract_address, caller_address);
    adl_utils::emit_adl_state_updated(
        event_emitter, market, is_long, pnl_to_pool_factor, max_pnl_factor, should_enable_adl
    );
    stop_cheat_caller_address(event_emitter.contract_address);
    assert(spy.get_events().events.len() == 1, 'There should be one event');
    spy
        .assert_emitted(
            @array![
                (
                    event_emitter.contract_address,
                    EventEmitter::Event::AdlStateUpdated(
                        EventEmitter::AdlStateUpdated {
                            market: market,
                            is_long: is_long,
                            pnl_to_pool_factor: pnl_to_pool_factor.into(),
                            max_pnl_factor: max_pnl_factor,
                            should_enable_adl: should_enable_adl
                        }
                    )
                )
            ]
        );

    tests_lib::teardown();
}


#[test]
#[should_panic(expected: ('block_no_smaller_than_required',))]
fn given_small_block_number_when_update_adl_state_then_fails() {
    // Setup
    let (_caller_address, _role_store, data_store, event_emitter, oracle) = setup();
    let market = 'market'.try_into().unwrap();
    let is_long = false;
    let block_value = 1234_u64;
    adl_utils::set_latest_adl_block(data_store, market, is_long, block_value);

    let block_numbers = array![10_u64, 11_u64];
    adl_utils::update_adl_state(data_store, event_emitter, oracle, market, is_long, block_numbers.span());

    tests_lib::teardown();
}


#[test]
#[should_panic(expected: ('invalid_size_delta_for_adl',))]
fn given_non_valid_position_when_create_adl_order_then_fails() {
    // Setup

    let (_caller_address, _role_store, data_store, event_emitter, _oracle) = setup();
    let accoun1 = 'accoun1'.try_into().unwrap();
    let market = 'market'.try_into().unwrap();
    let collateral_token = 'token'.try_into().unwrap();
    let params = adl_utils::CreateAdlOrderParams {
        data_store: data_store,
        event_emitter: event_emitter,
        account: accoun1,
        market: market,
        collateral_token: collateral_token,
        is_long: false,
        size_delta_usd: 100,
        updated_at_block: 100
    };
    adl_utils::create_adl_order(params);
}


#[test]
fn given_normal_conditions_when_create_adl_order_then_works() { // Setup
    let (_caller_address, _role_store, data_store, event_emitter, _oracle) = setup();
    // TODO
    // For testing "position_utils::get_position_key",  ".data_store.get_position" should be implmented
    let account1 = 'account1'.try_into().unwrap();
    let market = 'market'.try_into().unwrap();
    let collateral_token = 'token'.try_into().unwrap();
    let params = adl_utils::CreateAdlOrderParams {
        data_store: data_store,
        event_emitter: event_emitter,
        account: account1,
        market: market,
        collateral_token: collateral_token,
        is_long: true,
        size_delta_usd: 0,
        updated_at_block: 100
    };
    let key = adl_utils::create_adl_order(params);
    // Assertions
    let order = data_store.get_order(key);
    assert(order.account == account1, 'wrong order');
    assert(order.order_type == OrderType::MarketDecrease(()), 'wrong type');
    assert(order.updated_at_block == 100, 'wrong updated');
}


#[test]
fn given_normal_conditions_when_update_adl_state_then_works() {
    // Setup
    let (caller_address, role_store, data_store, event_emitter, oracle) = setup();
    // TODO
    // For testing "get_enabled_market",  "get_market_prices" and "is_pnl_factor_exceeded_direct" should be implmented
    let is_long = false;
    let market_token_address = contract_address_const::<'market_token'>();
    let index_token_address = contract_address_const::<'index_token'>();
    let long_token_address = contract_address_const::<'long_token'>();
    let short_token_address = contract_address_const::<'short_token'>();
    let mut market = Market {
        market_token: market_token_address,
        index_token: index_token_address,
        long_token: long_token_address,
        short_token: short_token_address,
    };

    start_cheat_caller_address(role_store.contract_address, caller_address);

    let price = Price { min: 1, max: 200 };

    stop_cheat_caller_address(role_store.contract_address);
    data_store.set_market(market_token_address, 0, market);

    oracle.set_primary_price(index_token_address, price);
    oracle.set_primary_price(long_token_address, price);
    oracle.set_primary_price(short_token_address, price);

    let block_value = 1_u64;
    let _set_block = adl_utils::set_latest_adl_block(data_store, market_token_address, is_long, block_value);
    let block_numbers = array![1_u64, 2_u64];

    adl_utils::update_adl_state(data_store, event_emitter, oracle, market_token_address, is_long, block_numbers.span());

    tests_lib::teardown();
}

fn setup() -> (
    ContractAddress, IRoleStoreDispatcher, IDataStoreDispatcher, IEventEmitterDispatcher, IOracleDispatcher
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
        _,
        role_store,
        data_store,
        event_emitter,
        _exchange_router,
        _deposit_handler,
        _deposit_vault,
        oracle,
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

    (caller_address, role_store, data_store, event_emitter, oracle)
}
