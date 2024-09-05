// Core lib imports.
use snforge_std::{declare, ContractClassTrait, start_cheat_caller_address, ContractClass};
use array::ArrayTrait;
use core::traits::Into;
use starknet::{get_caller_address, ContractAddress, contract_address_const,};

// Local imports.
use satoru::test_utils::tests_lib;
use satoru::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::data::{data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait}, keys};
use satoru::oracle::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
use satoru::bank::bank::{IBankDispatcher, IBankDispatcherTrait};
use satoru::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::swap::swap_utils::SwapParams;
use satoru::role::role;
use satoru::market::market::Market;
use satoru::market::market_token::{IMarketTokenDispatcher, IMarketTokenDispatcherTrait};
use satoru::price::price::{Price, PriceTrait};
use satoru::market::market_factory::{IMarketFactoryDispatcher, IMarketFactoryDispatcherTrait};
use debug::PrintTrait;


//TODO Tests need to be added after implementation of swap_utils

fn deploy_tokens() -> (ContractAddress, ContractAddress, ContractAddress) {
    let contract = declare("ERC20").unwrap();
    let caller_address: ContractAddress = tests_lib::get_c4ller_address();
    let constructor_calldata = array!['satoru_index', 'STU', 18, 4000, 0, caller_address.into()];
    let constructor_calldata1 = array!['satoru_long', 'STU', 18, 4000, 0, caller_address.into()];
    let constructor_calldata2 = array!['satoru_short', 'STU', 18, 4000, 0, caller_address.into()];

    let (contract_address1, _) = contract.deploy(@constructor_calldata).unwrap();
    let (contract_address2, _) = contract.deploy(@constructor_calldata1).unwrap();
    let (contract_address3, _) = contract.deploy(@constructor_calldata2).unwrap();

    (contract_address1, contract_address2, contract_address3)
}

/// Utility function to setup the test environment.
///
/// # Returns
///
/// * `ContractAddress` - The address of the caller.
/// * `IDataStoreDispatcher` - The data store dispatcher.
/// * `IEventEmitterDispatcher` - The event emitter dispatcher.
/// * `IOracleDispatcher` - The oracle dispatcher dispatcher.
/// * `IBankDispatcher` - The bank dispatcher.
/// * `IRoleStoreDispatcher` - The role store dispatcher.
/// * `ISwapHandlerDispatcher` - The swap handler dispatcher.
fn setup() -> (
    ContractAddress,
    IDataStoreDispatcher,
    IEventEmitterDispatcher,
    IOracleDispatcher,
    IBankDispatcher,
    IRoleStoreDispatcher,
    ISwapHandlerDispatcher,
    IMarketFactoryDispatcher,
    IERC20Dispatcher,
    IERC20Dispatcher,
    IERC20Dispatcher
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
        market_factory,
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
        _referral_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        swap_handler,
        bank,
        _,
        _,
    ) =
        tests_lib::setup();

    let (index_token_address, long_token_address, short_token_address) = deploy_tokens();
    let index_token_handler = IERC20Dispatcher { contract_address: index_token_address };
    let long_token_handler = IERC20Dispatcher { contract_address: long_token_address };
    let short_token_handler = IERC20Dispatcher { contract_address: short_token_address };

    start_cheat_caller_address(index_token_address, caller_address);
    start_cheat_caller_address(long_token_address, caller_address);
    start_cheat_caller_address(short_token_address, caller_address);

    index_token_handler.mint(caller_address, 2000000000000000000);
    long_token_handler.mint(caller_address, 2000000000000000000);
    short_token_handler.mint(caller_address, 2000000000000000000);

    (
        caller_address,
        data_store,
        event_emitter,
        oracle,
        bank,
        role_store,
        swap_handler,
        market_factory,
        index_token_handler,
        long_token_handler,
        short_token_handler
    )
}


#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_not_controller_when_swap_then_fails() {
    let (
        caller_address,
        data_store,
        event_emitter,
        oracle,
        bank,
        role_store,
        swap_handler,
        _market_factory,
        _index_token_handler,
        _long_token_handler,
        _short_token_handler
    ) =
        setup();

    // Revoke the caller the `CONTROLLER` role.
    role_store.revoke_role(caller_address, role::CONTROLLER);

    let mut market = Market {
        market_token: contract_address_const::<'market_token'>(),
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };

    let mut swap = SwapParams {
        data_store: data_store,
        event_emitter: event_emitter,
        oracle: oracle,
        bank: bank,
        key: 1,
        token_in: contract_address_const::<'token_in'>(),
        amount_in: 1,
        swap_path_markets: ArrayTrait::new().span(),
        min_output_amount: 1,
        receiver: contract_address_const::<'receiver'>(),
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
    };

    swap_handler.swap(swap);
    tests_lib::teardown();
}


#[test]
fn given_amount_in_is_zero_then_works() {
    //Change that when swap_handler has been implemented
    let (
        _caller_address,
        data_store,
        event_emitter,
        oracle,
        bank,
        _role_store,
        swap_handler,
        _market_factory,
        _index_token_handler,
        _long_token_handler,
        _short_token_handler
    ) =
        setup();

    let mut market = Market {
        market_token: contract_address_const::<'market_token'>(),
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };

    let mut swap = SwapParams {
        data_store: data_store,
        event_emitter: event_emitter,
        oracle: oracle,
        bank: bank,
        key: 1,
        token_in: contract_address_const::<'token_in'>(),
        amount_in: 0,
        swap_path_markets: ArrayTrait::new().span(),
        min_output_amount: 1,
        receiver: contract_address_const::<'receiver'>(),
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
    };

    let swap_result = swap_handler.swap(swap);

    assert(swap_result == (contract_address_const::<'token_in'>(), 0), 'Error');

    tests_lib::teardown();
}


#[test]
#[should_panic(expected: ('insufficient output amount', 1, 2))]
fn given_insufficient_output_then_fails() {
    //Change that when swap_handler has been implemented
    let (
        _caller_address,
        data_store,
        event_emitter,
        oracle,
        bank,
        _role_store,
        swap_handler,
        _market_factory,
        _index_token_handler,
        _long_token_handler,
        _short_token_handler
    ) =
        setup();

    let mut market = Market {
        market_token: contract_address_const::<'market_token'>(),
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };

    let mut swap = SwapParams {
        data_store: data_store,
        event_emitter: event_emitter,
        oracle: oracle,
        bank: bank,
        key: 1,
        token_in: contract_address_const::<'token_in'>(),
        amount_in: 1,
        swap_path_markets: ArrayTrait::new().span(),
        min_output_amount: 2,
        receiver: contract_address_const::<'receiver'>(),
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
    };

    let swap_result = swap_handler.swap(swap);

    assert(swap_result == (contract_address_const::<'token_in'>(), 1), 'Error');

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_swap_then_works() {
    // Change that when swap_handler has been implemented
    let (
        _caller_address,
        data_store,
        event_emitter,
        oracle,
        bank,
        _role_store,
        swap_handler,
        _market_factory,
        _index_token_handler,
        long_token_handler,
        _short_token_handler
    ) =
        setup();

    let mut market = Market {
        market_token: contract_address_const::<'market_token'>(),
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };

    let mut swap = SwapParams {
        data_store: data_store,
        event_emitter: event_emitter,
        oracle: oracle,
        bank: bank,
        key: 1,
        token_in: long_token_handler.contract_address,
        amount_in: 2,
        swap_path_markets: ArrayTrait::new().span(),
        min_output_amount: 1,
        receiver: contract_address_const::<'receiver'>(),
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
    };

    let swap_result = swap_handler.swap(swap);

    assert(swap_result == (long_token_handler.contract_address, 2), 'Error');

    tests_lib::teardown();
}


#[test]
fn given_swap_path_market_then_works() {
    let (
        _caller_address,
        data_store,
        event_emitter,
        oracle,
        bank,
        _role_store,
        swap_handler,
        market_factory,
        index_token_handler,
        long_token_handler,
        short_token_handler
    ) =
        setup();

    //create Market
    let index_token = index_token_handler.contract_address;
    let long_token = long_token_handler.contract_address;
    let short_token = short_token_handler.contract_address;
    let market_type = 'market_type';

    let market_token_deployed_address = market_factory.create_market(index_token, long_token, short_token, market_type);

    let mut market = Market {
        market_token: market_token_deployed_address,
        index_token: index_token,
        long_token: long_token,
        short_token: short_token,
    };
    let price = Price { min: 10, max: 100 };
    let key1 = keys::pool_amount_key(market_token_deployed_address, long_token);
    let key2 = keys::pool_amount_key(market_token_deployed_address, short_token);

    let key3 = keys::max_pool_amount_key(market_token_deployed_address, long_token);
    let key4 = keys::max_pool_amount_key(market_token_deployed_address, short_token);

    oracle.set_primary_price(index_token, price);
    oracle.set_primary_price(long_token, price);
    oracle.set_primary_price(short_token, price);

    data_store.set_market(market_token_deployed_address, 1, market);
    data_store.set_u256(key1, 361850278866613121369732);
    data_store.set_u256(key2, 361850278866613121369732);

    data_store.set_u256(key3, 661850278866613121369732);
    data_store.set_u256(key4, 661850278866613121369732);

    let mut swap_path_markets = ArrayTrait::<Market>::new();
    swap_path_markets.append(market);

    let mut swap = SwapParams {
        data_store: data_store,
        event_emitter: event_emitter,
        oracle: oracle,
        bank: bank,
        key: 1,
        token_in: long_token,
        amount_in: 200000000000000000,
        swap_path_markets: swap_path_markets.span(),
        min_output_amount: 1,
        receiver: market_token_deployed_address,
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
    };

    let swap_result = swap_handler.swap(swap);
    assert(swap_result == (short_token, 20000000000000000), 'Error');

    tests_lib::teardown();
}
// TODO add more tested when swap_handler has been implemented


