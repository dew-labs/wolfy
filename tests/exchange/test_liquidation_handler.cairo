use satoru::data::{data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait}, keys};

use satoru::event::event_emitter::{IEventEmitterDispatcher};
use satoru::exchange::base_order_handler::{IBaseOrderHandler};

use satoru::exchange::liquidation_handler::{
    LiquidationHandler, ILiquidationHandlerDispatcher, ILiquidationHandler, ILiquidationHandlerDispatcherTrait
};
use satoru::liquidation::liquidation_utils::create_liquidation_order;
use satoru::market::market::{Market};
use satoru::mock::referral_storage;
use satoru::nonce::nonce_utils;
use satoru::oracle::{
    oracle::{Oracle, IOracleDispatcher, IOracleDispatcherTrait},
    oracle_store::{IOracleStoreDispatcher, IOracleStoreDispatcherTrait},
    interfaces::account::{IAccount, IAccountDispatcher, IAccountDispatcherTrait}, oracle_utils::SetPricesParams
};

use satoru::order::order::{Order, OrderType, OrderTrait, DecreasePositionSwapType};
use satoru::position::{position::Position, position_utils::get_position_key};
use satoru::price::price::Price;

use satoru::role::{
    role, role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait},
    role_module::{IRoleModuleDispatcher, IRoleModuleDispatcherTrait}
};
use satoru::test_utils::tests_lib;

use satoru::utils::precision;
use satoru::utils::span32::{Span32, Array32Trait};
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_number, ContractClassTrait,
    DeclareResultTrait, ContractClass
};
use starknet::{
    ContractAddress, contract_address_const, contract_address_to_felt252, ClassHash, Felt252TryIntoContractAddress
};
use traits::Default;

const max_u256: u256 = 340282366920938463463374607431768211455;

#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_unauthorized_access_when_create_execute_liquidation_then_fails() {
    // Setup

    let collateral_token: ContractAddress = contract_address_const::<1>();
    let (
        _data_store,
        _liquidation_keeper,
        _liquidation_handler_address,
        liquidation_handler_dispatcher,
        _,
        _role_store,
        _,
        _,
        _
    ) =
        _setup();
    let oracle_params = Default::default();

    // Test
    // Check that the test function panics when the caller doesn't have the LIQUIDATION_KEEPER role
    liquidation_handler_dispatcher
        .execute_liquidation(
            account: contract_address_const::<'account'>(),
            market: contract_address_const::<'market'>(),
            collateral_token: collateral_token,
            is_long: true,
            oracle_params: oracle_params
        );
}

#[test]
#[ignore]
#[should_panic(expected: ('empty price feed', 'ETH'))]
fn given_empty_price_feed_multiplier_when_create_execute_liquidation_then_fails() {
    // Setup
    let _collateral_token: ContractAddress = contract_address_const::<1>();
    let (
        _data_store,
        liquidation_keeper,
        liquidation_handler_address,
        liquidation_handler_dispatcher,
        _,
        role_store,
        _,
        _,
        _
    ) =
        _setup();

    start_cheat_caller_address(role_store.contract_address, admin());
    role_store.grant_role(liquidation_keeper, role::LIQUIDATION_KEEPER);
    stop_cheat_caller_address(role_store.contract_address);
    start_cheat_caller_address(liquidation_handler_address, liquidation_keeper);

    let collateral_token: ContractAddress = contract_address_const::<'USDC'>();
    let token1 = contract_address_const::<'ETH'>();
    let _price_feed_tokens1 = contract_address_const::<'price_feed_tokens'>();

    let _price: Price = Default::default();

    let mut oracle_params = mock_set_prices_params(token1, collateral_token);
    oracle_params.price_feed_tokens = array![token1];

    // Test
    // Check that execute_liquidation calls 'with_oracle_prices_before' and fails
    liquidation_handler_dispatcher
        .execute_liquidation(
            account: contract_address_const::<'account'>(),
            market: contract_address_const::<'market'>(),
            collateral_token: collateral_token,
            is_long: true,
            oracle_params: oracle_params
        );
}


#[test]
#[should_panic(expected: ('FeatureUtils: disabled feature',))]
fn given_disabled_feature_when_create_execute_liquidation_then_fails() {
    // Setup

    let (
        data_store,
        liquidation_keeper,
        liquidation_handler_address,
        liquidation_handler_dispatcher,
        _event_emitter,
        role_store,
        _oracle,
        signer1,
        signer2
    ) =
        _setup();
    let account = contract_address_const::<'account'>();

    // Grant LIQUIDATION_KEEPER role
    start_cheat_caller_address(role_store.contract_address, admin());
    role_store.grant_role(liquidation_keeper, role::LIQUIDATION_KEEPER);
    stop_cheat_caller_address(role_store.contract_address);
    start_cheat_caller_address(liquidation_handler_address, liquidation_keeper);

    let (collateral_token, token1, _fee_token) = setup_tokens();
    let token2 = contract_address_const::<'BTC'>();

    // Use mock account to match keys
    signer1.change_owner(1221698997303567203808303576674742997327105320284925779268978961645745386877, 0, 0);
    signer2.change_owner(1221698997303567203808303576674742997327105320284925779268978961645745386877, 0, 0);

    data_store.set_token_id(token1, 1);
    data_store.set_token_id(token2, 2);
    data_store.set_token_id(collateral_token, 3);

    // Set price feed multiplier
    data_store.set_u256(keys::price_feed_multiplier_key(token1), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::price_feed_multiplier_key(token2), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::price_feed_multiplier_key(collateral_token), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::max_oracle_ref_price_deviation_factor(), max_u256);

    let _usdc_price = Price { min: 1000000, max: 1000000 };
    let _eth_price = Price { min: 17500000000000, max: 17500000000000 };
    let mut market = Market {
        market_token: contract_address_const::<'market'>(),
        index_token: collateral_token,
        long_token: token1,
        short_token: token1,
    };
    data_store.set_market(market.market_token, 0, market);

    // Set position
    let pos_key = get_position_key(account, market.market_token, collateral_token, true);
    let mut position: Position = Default::default();
    position.account = account;
    position.size_in_usd = precision::FLOAT_PRECISION_SQRT;
    position.collateral_token = collateral_token;
    position.is_long = true;
    position.size_in_tokens = 100;
    data_store.set_position(pos_key, position);

    // Disable feature
    let key = keys::execute_order_feature_disabled_key(liquidation_handler_address, OrderType::Liquidation);
    data_store.set_bool(key, true);

    let oracle_params = mock_set_prices_params(token1, collateral_token);

    // Test
    liquidation_handler_dispatcher
        .execute_liquidation(
            account: account,
            market: market.market_token,
            collateral_token: collateral_token,
            is_long: true,
            oracle_params: oracle_params
        );
}


#[test]
#[should_panic(expected: ('negative open interest',))]
fn given_negative_open_interest_when_create_execute_liquidation_then_fails() {
    // Setup

    let (
        data_store,
        liquidation_keeper,
        liquidation_handler_address,
        liquidation_handler_dispatcher,
        _event_emitter,
        role_store,
        _oracle,
        signer1,
        signer2
    ) =
        _setup();
    let account = contract_address_const::<'account'>();

    // Grant LIQUIDATION_KEEPER role
    start_cheat_caller_address(role_store.contract_address, admin());
    role_store.grant_role(liquidation_keeper, role::LIQUIDATION_KEEPER);
    stop_cheat_caller_address(role_store.contract_address);
    start_cheat_caller_address(liquidation_handler_address, liquidation_keeper);

    let collateral_token: ContractAddress = contract_address_const::<'USDC'>();
    let token1 = contract_address_const::<'ETH'>();
    let token2 = contract_address_const::<'BTC'>();

    // Use mock account to match keys
    signer1.change_owner(1221698997303567203808303576674742997327105320284925779268978961645745386877, 0, 0);
    signer2.change_owner(1221698997303567203808303576674742997327105320284925779268978961645745386877, 0, 0);

    data_store.set_token_id(token1, 1);
    data_store.set_token_id(token2, 2);
    data_store.set_token_id(collateral_token, 3);

    // Set price feed multiplier
    data_store.set_u256(keys::price_feed_multiplier_key(token1), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::price_feed_multiplier_key(token2), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::price_feed_multiplier_key(collateral_token), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::max_oracle_ref_price_deviation_factor(), max_u256);

    let _usdc_price = Price { min: 1000000, max: 1000000 };
    let _eth_price = Price { min: 17500000000000, max: 17500000000000 };
    let mut market = Market {
        market_token: contract_address_const::<'market'>(),
        index_token: collateral_token,
        long_token: token1,
        short_token: token1,
    };
    data_store.set_market(market.market_token, 0, market);

    // Set position
    let pos_key = get_position_key(account, market.market_token, collateral_token, true);
    let mut position: Position = Default::default();
    position.account = account;
    position.size_in_usd = precision::FLOAT_PRECISION_SQRT;
    position.collateral_token = collateral_token;
    position.is_long = true;
    position.size_in_tokens = 100;
    data_store.set_position(pos_key, position);

    // Set open interest
    let interest_key1 = keys::open_interest_key(market.market_token, market.long_token, true);
    data_store.set_u256(interest_key1, 1000000000000000000000);
    let oracle_params = mock_set_prices_params(token1, collateral_token);

    // Test
    liquidation_handler_dispatcher
        .execute_liquidation(
            account: account,
            market: market.market_token,
            collateral_token: collateral_token,
            is_long: true,
            oracle_params: oracle_params
        );
}


#[test]
fn given_normal_conditions_when_create_execute_liquidation_then_works() {
    // Setup

    let (
        data_store,
        liquidation_keeper,
        liquidation_handler_address,
        liquidation_handler_dispatcher,
        _event_emitter,
        role_store,
        oracle,
        signer1,
        signer2
    ) =
        _setup();
    let account = contract_address_const::<'account'>();

    // Grant LIQUIDATION_KEEPER role
    start_cheat_caller_address(role_store.contract_address, admin());
    role_store.grant_role(liquidation_keeper, role::LIQUIDATION_KEEPER);
    stop_cheat_caller_address(role_store.contract_address);
    start_cheat_caller_address(liquidation_handler_address, liquidation_keeper);

    let (collateral_token, token1, fee_token) = setup_tokens();
    let token2 = contract_address_const::<'BTC'>();

    // Use mock account to match keys
    signer1.change_owner(1221698997303567203808303576674742997327105320284925779268978961645745386877, 0, 0);
    signer2.change_owner(1221698997303567203808303576674742997327105320284925779268978961645745386877, 0, 0);

    data_store.set_token_id(token1, 1);
    data_store.set_token_id(token2, 2);
    data_store.set_token_id(collateral_token, 3);

    data_store.set_address(keys::fee_token(), fee_token);

    // Set price feed multiplier
    data_store.set_u256(keys::price_feed_multiplier_key(token1), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::price_feed_multiplier_key(token2), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::price_feed_multiplier_key(collateral_token), precision::FLOAT_PRECISION);
    data_store.set_u256(keys::max_oracle_ref_price_deviation_factor(), max_u256);

    let _usdc_price = Price { min: 10000000000000000, max: 10000000000000000 };
    let _eth_price = Price { min: 175000000000000000000000, max: 175000000000000000000000 };
    let mut market = Market {
        market_token: contract_address_const::<'market'>(),
        index_token: collateral_token,
        long_token: token1,
        short_token: token1,
    };
    data_store.set_market(market.market_token, 0, market);

    // Set position
    let pos_key = get_position_key(account, market.market_token, collateral_token, true);
    let mut position: Position = Default::default();
    position.account = account;
    position.size_in_usd = precision::FLOAT_PRECISION_SQRT;
    position.collateral_token = collateral_token;
    position.is_long = true;
    position.size_in_tokens = 100;
    data_store.set_position(pos_key, position);

    // Set open interest
    let interest_key1 = keys::open_interest_key(market.market_token, market.long_token, true);
    data_store.set_u256(interest_key1, 10000000000000000000000000000000);

    let interest_key2 = keys::open_interest_key(market.market_token, collateral_token, true);
    data_store.set_u256(interest_key2, 100000000000000000000);
    let interest_key3 = keys::open_interest_in_tokens_key(market.market_token, collateral_token, true);
    data_store.set_u256(interest_key3, 100000000000000000000);

    let current_nonce = nonce_utils::get_current_nonce(data_store);

    let oracle_params = mock_set_prices_params(token1, collateral_token);

    // Test
    liquidation_handler_dispatcher
        .execute_liquidation(
            account: account,
            market: market.market_token,
            collateral_token: collateral_token,
            is_long: true,
            oracle_params: oracle_params
        );

    // Check 'with_oracle_prices_after' clear the prices
    let prices_count = oracle.get_tokens_with_prices_count();
    assert(prices_count == 0, 'invalid prices_count');

    // Check new order is created and nonce is increased
    let last_nonce = nonce_utils::get_current_nonce(data_store);
    assert(last_nonce == current_nonce + 1, 'invalid last_nonce');

    // Check new order removed
    let order_key = nonce_utils::compute_key(data_store.contract_address, last_nonce);
    let order_by_key = data_store.get_order(order_key);
    assert(order_by_key == Default::default(), 'Invalid order by key');
}


// *********************************************************************************************
// *                              SETUP                                                        *
// *********************************************************************************************

fn mock_set_prices_params(token1: ContractAddress, token2: ContractAddress) -> SetPricesParams {
    SetPricesParams {
        signer_info: 1,
        tokens: array![token1],
        compacted_min_oracle_block_numbers: array![10,],
        compacted_max_oracle_block_numbers: array![20],
        compacted_oracle_timestamps: array![1000,],
        compacted_decimals: array![18],
        compacted_min_prices: array![1700,],
        compacted_min_prices_indexes: array![0,],
        compacted_max_prices: array![1750],
        compacted_max_prices_indexes: array![0,],
        signatures: array![array!['signature1', 'signature2'].span()],
        price_feed_tokens: array![token2],
    }
}


fn admin() -> ContractAddress {
    tests_lib::get_c4ller_address()
}

fn deploy_signers(signer1: ContractAddress, signer2: ContractAddress) -> (ContractAddress, ContractAddress) {
    let mock_account_contract = tests_lib::declare_mock_account();

    let contract_address = tests_lib::deploy_mock_account_at(*mock_account_contract, signer1);
    let contract_address2 = tests_lib::deploy_mock_account_at(*mock_account_contract, signer2);
    (contract_address, contract_address2)
}


fn setup_tokens() -> (ContractAddress, ContractAddress, ContractAddress) {
    let contract = declare("ERC20").unwrap().contract_class();
    let deployed_contract_address: ContractAddress = contract_address_const::<'USDC'>();
    let mut constructor_calldata: Array<felt252> = array![
        'USDC', 'USDC', 18, 10000000000000000000000000000, 0, admin().into()
    ];

    let (usdc_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();

    let deployed_contract_address2: ContractAddress = contract_address_const::<'ETH'>();
    let constructor_calldata2 = array!['ETH', 'ETH', 18, 100000000000000000000000000000, 0, admin().into()];
    let (eth_address, _) = contract.deploy_at(@constructor_calldata2, deployed_contract_address2).unwrap();

    let deployed_contract_address3: ContractAddress = contract_address_const::<'FEE'>();
    let constructor_calldata3 = array!['FEE', 'FEE', 18, 100000000000000000000000000000, 0, admin().into()];
    let (fee_address, _) = contract.deploy_at(@constructor_calldata3, deployed_contract_address3).unwrap();

    (usdc_address, eth_address, fee_address)
}


fn _setup() -> (
    IDataStoreDispatcher,
    ContractAddress,
    ContractAddress,
    ILiquidationHandlerDispatcher,
    IEventEmitterDispatcher,
    IRoleStoreDispatcher,
    IOracleDispatcher,
    IAccountDispatcher,
    IAccountDispatcher
) {
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
        _market_factory,
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
        liquidation_handler,
        _,
        _,
        _,
        oracle_store,
    ) =
        tests_lib::setup();

    let liquidation_keeper: ContractAddress = 0x2233.try_into().unwrap();

    let (signer1, signer2) = deploy_signers(
        contract_address_const::<'signer1'>(), contract_address_const::<'signer2'>()
    );

    start_cheat_caller_address(oracle_store.contract_address, admin());
    oracle_store.add_signer(signer1);
    oracle_store.add_signer(signer2);
    stop_cheat_caller_address(oracle_store.contract_address);

    start_cheat_caller_address(role_store.contract_address, admin());
    role_store.grant_role(liquidation_handler.contract_address, role::CONTROLLER);
    stop_cheat_caller_address(role_store.contract_address);

    start_cheat_caller_address(data_store.contract_address, admin());

    (
        data_store,
        liquidation_keeper,
        liquidation_handler.contract_address,
        liquidation_handler,
        event_emitter,
        role_store,
        oracle,
        IAccountDispatcher { contract_address: signer1 },
        IAccountDispatcher { contract_address: signer2 },
    )
}
