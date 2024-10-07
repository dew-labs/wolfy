// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.

use result::ResultTrait;
use traits::{TryInto, Into};
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const, ClassHash,};
use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait, ContractClass};


// Local imports.
use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::market::market_factory::{IMarketFactoryDispatcher, IMarketFactoryDispatcherTrait};
use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::market::market::{Market, UniqueIdMarket};
use satoru::market::market_token::{IMarketTokenDispatcher, IMarketTokenDispatcherTrait};
use satoru::role::role;
use satoru::test_utils::tests_lib;

#[test]
fn given_normal_conditions_when_create_market_then_market_is_created() {
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

    // Check the market is as expected.
    assert(market.index_token == index_token, 'bad_market');
    assert(market.long_token == long_token, 'bad_market');
    assert(market.short_token == short_token, 'bad_market');

    // Check the market token was deployed.
    let market_token = IMarketTokenDispatcher { contract_address: market_token_deployed_address };
    // Query the name of the market token.
    let market_token_name = market_token.name();
    assert(market_token_name == 'Wolfy Market', 'bad_market_token_name');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

#[test]
fn given_bad_params_when_create_market_then_fail() {
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
        _data_store,
        _event_emitter,
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Create a market.
    let market_token = contract_address_const::<'market_token'>();
    // We use an invalid address as the index token.
    let index_token = contract_address_const::<0>();
    let long_token = contract_address_const::<'long_token'>();
    let short_token = contract_address_const::<'short_token'>();
    let _market_type = 'market_type';

    let _new_market = Market { market_token, index_token, long_token, short_token, };

    // Try to create a market.
    // This must fail because the index token is invalid.
    // For now it seems we cannot catch the panic handling the result.
    // TODO: Find a way to catch the panic.
    // let result = market_factory.create_market(index_token, long_token, short_token, market_type);
    // match result {
    //     // If the result is ok, then the test failed.
    //     Result::Ok(_) => assert(false, 'bad_result'),
    //     // If the result is err, then the test passed.
    //     Result::Err(_) => {}
    // }

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}

/// Utility function to setup the test environment.
fn setup() -> (
    // This caller address will be used with `start_cheat_caller_address` cheatcode to mock the caller address.,
    ContractAddress,
    // Address of the `MarketFactory` contract.
    ContractAddress,
    // Address of the `RoleStore` contract.
    ContractAddress,
    // Address of the `DataStore` contract.
    ContractAddress,
    // The `MarketToken` class hash for the factory.
    ContractClass,
    // Interface to interact with the `MarketFactory` contract.
    IMarketFactoryDispatcher,
    // Interface to interact with the `RoleStore` contract.
    IRoleStoreDispatcher,
    // Interface to interact with the `DataStore` contract.
    IDataStoreDispatcher,
    // Interface to interact with the `EventEmitter` contract.
    IEventEmitterDispatcher,
) {
    let (
        caller_address,
        market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
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
