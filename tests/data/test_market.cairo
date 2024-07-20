use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const};
use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait};
use poseidon::poseidon_hash_span;

use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::market::market_factory::{IMarketFactoryDispatcher, IMarketFactoryDispatcherTrait};
use satoru::role::role;
use satoru::market::market::{Market};
use satoru::test_utils::tests_lib;


/// Utility function to setup the test environment.
///
/// # Returns
///
/// * `ContractAddress` - The address of the caller.
/// * `IRoleStoreDispatcher` - The role store dispatcher.
/// * `IDataStoreDispatcher` - The data store dispatcher.
fn setup() -> (ContractAddress, IRoleStoreDispatcher, IDataStoreDispatcher, IMarketFactoryDispatcher) {
    let (
        caller_address,
        _market_factory__address,
        _role_store_address,
        _data_store_address,
        _market_token_class_hash,
        market_factory,
        role_store,
        data_store,
        _event_emitter,
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
        _liquidation_handler
    ) = tests_lib::setup();
    (caller_address, role_store, data_store, market_factory)
}

#[test]
fn given_normal_conditions_when_set_market_new_and_override_then_works() {
    // Setup
    let (caller_address, role_store, data_store, market_factory) = setup();
    let address_zero = contract_address_const::<0>();

    let key = contract_address_const::<123456789>();
    let mut market = Market {
        market_token: key, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    // Test logic

    // Test set_market function with a new key.
    data_store.set_market(key, 0, market);

    let market_by_key = data_store.get_market(key);
    assert(market_by_key == market, 'Invalid market by key');

    // Update the market using the set_market function and then retrieve it to check the update was successful
    let address_one: ContractAddress = 1.try_into().unwrap();
    market.index_token = address_one;
    data_store.set_market(key, 0, market);

    let market_by_key = data_store.get_market(key);
    assert(market_by_key == market, 'Invalid market by key');
    assert(market_by_key.index_token == address_one, 'Invalid market value');

    tests_lib::teardown(data_store, market_factory);
}

fn given_normal_conditions_when_set_market_and_get_by_salt_then_works() {
    // Setup
    let (caller_address, role_store, data_store, market_factory) = setup();
    let address_zero = contract_address_const::<0>();

    let key = contract_address_const::<123456789>();
    let mut market = Market {
        market_token: key, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    let salt = poseidon_hash_span(array!['SATORU_MARKET', 0, 0, 0, 0].span());

    // Test logic

    // Test set_market function with a new key.
    data_store.set_market(key, salt, market);

    let market_by_key = data_store.get_by_salt_market(salt);
    assert(market_by_key == market, 'Invalid market by key');

    tests_lib::teardown(data_store, market_factory);
}

#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_not_market_keeper_when_set_market_then_fails() {
    // Setup
    let (caller_address, role_store, data_store, market_factory) = setup();
    role_store.revoke_role(caller_address, role::MARKET_KEEPER);
    let address_zero = contract_address_const::<0>();

    let key = contract_address_const::<123456789>();
    let mut market = Market {
        market_token: key, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    // Test logic

    // Test set_market function without permission
    data_store.set_market(key, 0, market);

    tests_lib::teardown(data_store, market_factory);
}

#[test]
fn given_normal_conditions_when_get_market_keys_then_works() {
    // Setup
    let (caller_address, role_store, data_store, market_factory) = setup();
    let address_zero = contract_address_const::<0>();

    let key = contract_address_const::<123456789>();
    let mut market = Market {
        market_token: key, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    let key_2: ContractAddress = 987654321.try_into().unwrap();
    let mut market_2 = Market {
        market_token: key_2, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    data_store.set_market(key, 0, market);
    data_store.set_market(key_2, 1, market_2);

    // Then
    let market_keys = data_store.get_market_keys(0, 2);
    assert(*market_keys.at(0) == key, 'market should be removed');
    assert(*market_keys.at(1) == key_2, 'market should be removed');

    tests_lib::teardown(data_store, market_factory);
}

#[test]
fn given_normal_conditions_when_remove_only_one_market_then_works() {
    // Setup
    let (caller_address, role_store, data_store, market_factory) = setup();
    let address_zero = contract_address_const::<0>();

    let key = contract_address_const::<123456789>();
    let mut market = Market {
        market_token: key, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    data_store.set_market(key, 0, market);

    // Given
    data_store.remove_market(key);

    // Then
    let market_by_key = data_store.get_market(key);
    assert(market_by_key.market_token.is_zero(), 'market should be removed');

    tests_lib::teardown(data_store, market_factory);
}

#[test]
fn given_normal_conditions_when_remove_1_of_n_market_then_works() {
    // Setup
    let (caller_address, role_store, data_store, market_factory) = setup();
    let address_zero = contract_address_const::<0>();
    let address_one: ContractAddress = 1.try_into().unwrap();

    let key = contract_address_const::<123456789>();
    let mut market = Market {
        market_token: key, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    let key_2: ContractAddress = 987654321.try_into().unwrap();
    let mut market_2 = Market {
        market_token: key_2, index_token: address_one, long_token: address_one, short_token: address_one,
    };

    data_store.set_market(key, 0, market);
    data_store.set_market(key_2, 0, market_2);

    // Given
    data_store.remove_market(key);

    // Then
    let market_by_key = data_store.get_market(key);
    assert(market_by_key.market_token.is_zero(), 'market1 shouldnt be removed');

    let market_2_by_key = data_store.get_market(key_2);
    assert(market_2_by_key.market_token.is_non_zero(), 'market2 shouldnt be removed');

    tests_lib::teardown(data_store, market_factory);
}


#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_not_market_keeper_when_remove_market_then_fails() {
    // Setup
    let (caller_address, role_store, data_store, market_factory) = setup();
    role_store.revoke_role(caller_address, role::MARKET_KEEPER);
    let address_zero = contract_address_const::<0>();

    let key = contract_address_const::<123456789>();
    let mut market = Market {
        market_token: key, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    data_store.set_market(key, 0, market);

    // Given
    data_store.remove_market(key);

    // Then
    tests_lib::teardown(data_store, market_factory);
}
