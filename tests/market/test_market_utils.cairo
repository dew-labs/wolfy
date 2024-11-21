// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.

// Local imports.
use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::data::keys;
use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use freyr::market::market::{Market, UniqueIdMarket, IntoMarketToken};
use freyr::market::market_factory::{IMarketFactoryDispatcher, IMarketFactoryDispatcherTrait};
use freyr::market::market_token::{IMarketTokenDispatcher, IMarketTokenDispatcherTrait};
use freyr::market::market_utils;
use freyr::price::price::{Price, PriceTrait};
use freyr::role::role;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::test_utils::tests_lib;
use freyr::utils::i256::{i256, i256_new};
use result::ResultTrait;
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_timestamp_global,
    stop_cheat_block_timestamp_global, ContractClassTrait, DeclareResultTrait, ContractClass
};
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const, ClassHash,};
use traits::{TryInto, Into};

#[test]
fn given_normal_conditions_when_get_open_interest_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Create a market.
    let index_token = contract_address_const::<'index_token'>();
    let long_token = contract_address_const::<'long_token'>();
    let short_token = contract_address_const::<'short_token'>();
    let market_type = 'market_type';

    let market_token_deployed_address = market_factory.create_market(index_token, long_token, short_token, market_type);

    // Get the market from the data store.
    // This must not panic, because the market was created in the previous step.
    // Hence the market must exist in the data store and it's safe to unwrap.
    let market = data_store.get_market(market_token_deployed_address);

    let collateral_token = contract_address_const::<'collateral_token'>();
    let is_long = true;
    let divisor = 3;

    let open_interest_data_store_key = keys::open_interest_key(
        market_token_deployed_address, collateral_token, is_long
    );
    data_store.set_u256(open_interest_data_store_key, 300);

    let open_interest = market_utils::get_open_interest_div(
        data_store, market_token_deployed_address, collateral_token, is_long, divisor
    );
    // Open interest is 300, so 300 / 3 = 100.
    assert(open_interest == 100, 'wrong open interest');

    let market_token = market.market_token();

    // Get the name of the market token.
    let market_token_name = market_token.name();
    assert(market_token_name == 'Wolfy Market', 'wrong market token name');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}


#[test]
fn given_normal_conditions_when_get_open_interest_in_tokens_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    let market_address = contract_address_const::<'market_address'>();
    let collateral_token = contract_address_const::<'collateral_token'>();
    let is_long = true;
    let divisor = 3;

    let open_interest_in_tokens_key = keys::open_interest_in_tokens_key(market_address, collateral_token, is_long);
    data_store.set_u256(open_interest_in_tokens_key, 300);

    let open_interest_in_tokens = market_utils::get_open_interest_in_tokens(
        data_store, market_address, collateral_token, is_long, divisor
    );
    // Open interest is 300, so 300 / 3 = 100.
    assert(open_interest_in_tokens == 100, 'wrong open interest');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_get_open_interest_in_tokens_for_market_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token'>();
    let market = Market {
        market_token: market_token_address,
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };
    let is_long = true;

    // Setup pre conditions.

    // Set open interest for long token.
    let open_interest_in_tokens_key_for_long = keys::open_interest_in_tokens_key(
        market_token_address, market.long_token, is_long
    );
    data_store.set_u256(open_interest_in_tokens_key_for_long, 100);

    // Set open interest for short token.
    let open_interest_in_tokens_key_for_short = keys::open_interest_in_tokens_key(
        market_token_address, market.short_token, is_long
    );
    data_store.set_u256(open_interest_in_tokens_key_for_short, 200);

    // Actual test case.
    let open_interest_in_tokens_for_market = market_utils::get_open_interest_in_tokens_for_market(
        data_store, @market, is_long
    );

    // Perform assertions.

    // Since long token != short token, then the divisor is 1 and the open interest is 100 + 200 = 300.
    assert(open_interest_in_tokens_for_market == 300, 'wrong open interest');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}


#[test]
fn given_normal_conditions_when_get_pool_amount_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // *************************************************************************
    //                     Case 1: long_token != short_token.
    // *************************************************************************
    let market_token_address = contract_address_const::<'market_token'>();
    let token_address = contract_address_const::<'token_address'>();
    let market = Market {
        market_token: market_token_address,
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };
    let pool_amount_key = keys::pool_amount_key(market_token_address, token_address);
    data_store.set_u256(pool_amount_key, 1000);

    let pool_amount = market_utils::get_pool_amount(data_store, @market, token_address);
    // long_token != short_token, so the pool amount is 1000 because the divisor is 1.
    assert(pool_amount == 1000, 'wrong pool amount');

    // *************************************************************************
    //                     Case 1: long_token == short_token.
    // *************************************************************************
    let market_token_address_2 = contract_address_const::<'market_token_2'>();
    let token_address_2 = contract_address_const::<'token_address_2'>();
    let market_2 = Market {
        market_token: market_token_address_2,
        index_token: contract_address_const::<'index_token_2'>(),
        long_token: contract_address_const::<'same_token'>(),
        short_token: contract_address_const::<'same_token'>(),
    };
    let pool_amount_key_2 = keys::pool_amount_key(market_token_address_2, token_address_2);
    data_store.set_u256(pool_amount_key_2, 1000);
    let pool_amount_2 = market_utils::get_pool_amount(data_store, @market_2, token_address_2);
    // long_token == short_token, so the pool amount is 500 because the divisor is 2.
    assert(pool_amount_2 == 500, 'wrong pool amount');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_get_max_pool_amount_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token_address'>();
    let token_address = contract_address_const::<'token_address'>();

    // Setup pre conditions.
    let max_pool_amount_key = keys::max_pool_amount_key(market_token_address, token_address);
    data_store.set_u256(max_pool_amount_key, 1000);

    // Actual test case.

    // Get the max pool amount.
    let max_pool_amount = market_utils::get_max_pool_amount(data_store, market_token_address, token_address);

    // Perform assertions.

    assert(max_pool_amount == 1000, 'wrong pool amount');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_get_max_open_interest_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token_address'>();
    let is_long = false;

    // Setup pre conditions.

    let max_open_interest_key = keys::max_open_interest_key(market_token_address, is_long);
    data_store.set_u256(max_open_interest_key, 1000);

    // Actual test case.

    // Get the max open interest.

    let max_open_interest = market_utils::get_max_open_interest(data_store, market_token_address, is_long);

    // Perform assertions.

    assert(max_open_interest == 1000, 'wrong pool amount');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_increment_claimable_collateral_amount_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let current_timestamp = 1000;
    let market_address = contract_address_const::<'market_address'>();
    let token = contract_address_const::<'token'>();
    let account = contract_address_const::<'account'>();
    let delta = 50;
    // The key for the claimable collateral amount for the account.
    // This is the key that will be used to assert the result.
    let claimable_collatoral_amount_for_account_key = 0x11df62b70ad974a354ae7d38b9e985489300785772473d224995d4dd6ac2d81;
    // The key for the claimable collateral amount for the market.
    // This is the key that will be used to assert the result.
    let claimable_collateral_amount_key = 0x7af284cf9ac7ef4a7bb96ad1004a1fb2b9d3c545ea9600edca47d4b033f9b85;

    // Setup pre conditions.

    // Fill required data store keys.
    data_store.set_u256(keys::claimable_collateral_time_divisor(), 1);

    // Actual test case.
    start_cheat_block_timestamp_global(current_timestamp);
    market_utils::increment_claimable_collateral_amount(
        data_store, event_emitter, market_address, token, account, delta
    );
    stop_cheat_block_timestamp_global();

    // Perform assertions.

    // The value of the claimable collateral amount for the account should now be 50.
    // Read the value from the data store using the hardcoded key and assert it.
    assert(data_store.get_u256(claimable_collatoral_amount_for_account_key) == 50, 'wrong value');
    assert(data_store.get_u256(claimable_collateral_amount_key) == 50, 'wrong value');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_increment_claimable_funding_amount_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_address = contract_address_const::<'market_address'>();
    let token = contract_address_const::<'token'>();
    let account = contract_address_const::<'account'>();
    let delta = 50;
    // The key for the claimable funding amount for the account.
    // This is the key that will be used to assert the result.
    let claimable_funding_amount_for_account_key = 0x1321919246b443e98ce5d62b2f6b23526c7f1c0d03db2dc2ec82d763a3a3446;
    // The key for the claimable funding amount for the market.
    // This is the key that will be used to assert the result.
    let claimable_funding_amount_key = 0x3ae3e6b61acb60cab724b0b9a1fc05e4f520a578ddbcd0ca40d05885207249;

    // Actual test case.
    market_utils::increment_claimable_funding_amount(data_store, event_emitter, market_address, token, account, delta);

    // Perform assertions.

    // The value of the claimable funding amount for the account should now be 50.
    // Read the value from the data store using the hardcoded key and assert it.
    assert(data_store.get_u256(claimable_funding_amount_for_account_key) == 50, 'wrong value');
    // The value of the claimable funding amount for the market should now be 50.
    // Read the value from the data store using the hardcoded key and assert it.
    assert(data_store.get_u256(claimable_funding_amount_key) == 50, 'wrong value');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_get_pool_divisor_then_works() {
    // long token == short token, should return 2.
    assert(
        market_utils::get_pool_divisor(contract_address_const::<1>(), contract_address_const::<1>()) == 2,
        'wrong pool divisor'
    );
    // long token != short token, should return 1.
    assert(
        market_utils::get_pool_divisor(contract_address_const::<1>(), contract_address_const::<2>()) == 1,
        'wrong pool divisor'
    );
}

#[test]
fn given_normal_conditions_when_get_pnl_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token'>();
    let market = Market {
        market_token: market_token_address,
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };
    let is_long = true;
    let maximize = true;
    let price = Price { min: 10, max: 50 };

    // Setup pre conditions.

    // Set open interest for long token.
    let open_interest_key_for_long = keys::open_interest_key(market_token_address, market.long_token, is_long);
    data_store.set_u256(open_interest_key_for_long, 100);
    // Set open interest for short token.
    let open_interest_key_for_short = keys::open_interest_key(market_token_address, market.short_token, is_long);
    data_store.set_u256(open_interest_key_for_short, 150);

    // Set open interest in tokens for long token.
    let open_interest_in_tokens_key_for_long = keys::open_interest_in_tokens_key(
        market_token_address, market.long_token, is_long
    );
    data_store.set_u256(open_interest_in_tokens_key_for_long, 200);

    // Set open interest in tokens for short token.
    let open_interest_in_tokens_key_for_short = keys::open_interest_in_tokens_key(
        market_token_address, market.short_token, is_long
    );
    data_store.set_u256(open_interest_in_tokens_key_for_short, 250);

    // Actual test case.
    let pnl = market_utils::get_pnl(data_store, @market, @price, is_long, maximize);

    // Perform assertions.
    assert(pnl == i256_new(22250, false), 'wrong pnl');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_zero_open_interest_when_get_pnl_then_returns_zero_pnl() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token'>();
    let market = Market {
        market_token: market_token_address,
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };
    let is_long = true;
    let maximize = true;
    let price = Price { min: 10, max: 50 };

    // Setup pre conditions.

    // Set open interest for long token.
    let open_interest_key_for_long = keys::open_interest_key(market_token_address, market.long_token, is_long);
    data_store.set_u256(open_interest_key_for_long, 0);
    // Set open interest for short token.
    let open_interest_key_for_short = keys::open_interest_key(market_token_address, market.short_token, is_long);
    data_store.set_u256(open_interest_key_for_short, 0);

    // Set open interest in tokens for long token.
    let open_interest_in_tokens_key_for_long = keys::open_interest_in_tokens_key(
        market_token_address, market.long_token, is_long
    );
    data_store.set_u256(open_interest_in_tokens_key_for_long, 200);

    // Set open interest in tokens for short token.
    let open_interest_in_tokens_key_for_short = keys::open_interest_in_tokens_key(
        market_token_address, market.short_token, is_long
    );
    data_store.set_u256(open_interest_in_tokens_key_for_short, 250);

    // Actual test case.
    let pnl = market_utils::get_pnl(data_store, @market, @price, is_long, maximize);

    // Perform assertions.
    assert(pnl == i256_new(0, false), 'wrong pnl');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_zero_open_interest_in_tokens_when_get_pnl_then_returns_zero_pnl() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token'>();
    let market = Market {
        market_token: market_token_address,
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };
    let is_long = true;
    let maximize = true;
    let price = Price { min: 10, max: 50 };

    // Setup pre conditions.

    // Set open interest for long token.
    let open_interest_key_for_long = keys::open_interest_key(market_token_address, market.long_token, is_long);
    data_store.set_u256(open_interest_key_for_long, 100);
    // Set open interest for short token.
    let open_interest_key_for_short = keys::open_interest_key(market_token_address, market.short_token, is_long);
    data_store.set_u256(open_interest_key_for_short, 200);

    // Set open interest in tokens for long token.
    let open_interest_in_tokens_key_for_long = keys::open_interest_in_tokens_key(
        market_token_address, market.long_token, is_long
    );
    data_store.set_u256(open_interest_in_tokens_key_for_long, 0);

    // Set open interest in tokens for short token.
    let open_interest_in_tokens_key_for_short = keys::open_interest_in_tokens_key(
        market_token_address, market.short_token, is_long
    );
    data_store.set_u256(open_interest_in_tokens_key_for_short, 0);

    // Actual test case.
    let pnl = market_utils::get_pnl(data_store, @market, @price, is_long, maximize);

    // Perform assertions.
    assert(pnl == i256_new(0, false), 'wrong pnl');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_get_position_impact_pool_amount_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token'>();

    // Setup pre conditions.

    // Fill required data store keys.
    let position_impact_pool_amount_key = keys::position_impact_pool_amount_key(market_token_address);
    data_store.set_u256(position_impact_pool_amount_key, 1000);

    // Actual test case.
    let position_impact_pool_amount = market_utils::get_position_impact_pool_amount(data_store, market_token_address);

    // Perform assertions.

    assert(position_impact_pool_amount == 1000, 'wrong pool amount');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_get_swap_impact_pool_amount_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token'>();
    let token = contract_address_const::<'token'>();

    // Setup pre conditions.

    // Fill required data store keys.
    let swap_impact_pool_amount_key = keys::swap_impact_pool_amount_key(market_token_address, token);
    data_store.set_u256(swap_impact_pool_amount_key, 1000);

    // Actual test case.
    let swap_impact_pool_amount = market_utils::get_swap_impact_pool_amount(data_store, market_token_address, token,);

    // Perform assertions.

    assert(swap_impact_pool_amount == 1000, 'wrong pool amount');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_apply_delta_to_position_impact_pool_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token'>();
    let delta = i256_new(50, false);

    // Setup pre conditions.

    // Fill required data store keys.
    let key = keys::position_impact_pool_amount_key(market_token_address);
    data_store.set_u256(key, 1000);

    // Actual test case.
    let next_value = market_utils::apply_delta_to_position_impact_pool(
        data_store, event_emitter, market_token_address, delta
    );

    // Perform assertions.

    assert(next_value == 1050, 'wrong value');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_apply_delta_to_swap_impact_pool_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        _caller_address,
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        _market_token_class,
        _market_factory,
        _role_store,
        data_store,
        event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables for the test case.
    let market_token_address = contract_address_const::<'market_token'>();
    let token = contract_address_const::<'token'>();
    let delta = i256_new(50, false);

    // Setup pre conditions.

    // Fill required data store keys.
    let key = keys::swap_impact_pool_amount_key(market_token_address, token);
    data_store.set_u256(key, 1000);

    // Actual test case.
    let next_value = market_utils::apply_delta_to_swap_impact_pool(
        data_store, event_emitter, market_token_address, token, delta
    );

    // Perform assertions.

    assert(next_value == 1050, 'wrong value');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}


/// Utility function to setup the test environment.
fn setup() -> (
    ContractAddress,
    ContractAddress,
    ContractAddress,
    ContractAddress,
    ContractClass,
    IMarketFactoryDispatcher,
    IRoleStoreDispatcher,
    IDataStoreDispatcher,
    IEventEmitterDispatcher,
) {
    let (
        caller_address,
        market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        _role_module_class,
        _bank_class,
        _governable_class,
        market_factory,
        role_store,
        data_store,
        event_emitter,
        _exchange_router,
        _deposit_handler,
        _deposit_vault,
        _oracle,
        _order_handler,
        _order_vault,
        _reader,
        _referral_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        _,
        _,
        _,
        _,
    ) =
        tests_lib::setup();

    (
        caller_address,
        market_factory.contract_address,
        role_store.contract_address,
        data_store.contract_address,
        market_token_class,
        market_factory,
        role_store,
        data_store,
        event_emitter,
    )
}
