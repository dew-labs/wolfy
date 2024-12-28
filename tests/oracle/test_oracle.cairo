use freyr::data::data_store::{DataStore, IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::data::keys;
use freyr::event::event_emitter::{EventEmitter, IEventEmitterDispatcher};
use freyr::oracle::oracle::{IOracleDispatcher, IOracleDispatcherTrait, Oracle, SetPricesParams};
use freyr::oracle::price_feed::PriceFeed;
use freyr::price::price::Price;
use freyr::role::role;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::test_utils::tests_lib;
use freyr::utils::precision;

use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::{ContractAddress, contract_address_const};

fn setup() -> (IDataStoreDispatcher, IOracleDispatcher) {
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
        _event_emitter,
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
        _swap_handler,
        _,
        _,
    ) =
        tests_lib::setup();

    (data_store, oracle)
}

#[test]
fn given_normal_conditions_when_set_primary_price_then_works() {
    let (_data_store, oracle) = setup();

    let token = contract_address_const::<111>();
    let price = Price { min: 10, max: 11 };

    oracle.set_primary_price(token, price);

    let price_from_view = oracle.get_primary_price(token);
    assert(price_from_view.min == price.min && price_from_view.max == price.max, 'wrong primary price');
    // teardown
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_clear_all_prices_then_works() {
    let (_data_store, oracle) = setup();

    let token1 = contract_address_const::<111>();
    let price1 = Price { min: 10, max: 11 };
    let token2 = contract_address_const::<222>();
    let price2 = Price { min: 20, max: 22 };

    oracle.set_primary_price(token1, price1);
    oracle.set_primary_price(token2, price2);
    assert(oracle.get_tokens_with_prices_count() == 2, 'wrong tokens count');

    oracle.clear_all_prices();
    assert(oracle.get_tokens_with_prices_count() == 0, 'wrong tokens count');
    // teardown
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_tokens_with_prices_count_then_works() {
    let (_data_store, oracle) = setup();
    let token1 = contract_address_const::<111>();
    let price1 = Price { min: 10, max: 11 };
    let token2 = contract_address_const::<222>();
    let price2 = Price { min: 20, max: 22 };
    let token3 = contract_address_const::<333>();
    let price3 = Price { min: 30, max: 33 };

    assert(oracle.get_tokens_with_prices_count() == 0, 'wrong tokens count');

    oracle.set_primary_price(token1, price1);
    oracle.set_primary_price(token2, price2);
    oracle.set_primary_price(token3, price3);

    assert(oracle.get_tokens_with_prices_count() == 3, 'wrong tokens count');
    // teardown
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_get_tokens_with_prices_then_works() {
    let (_data_store, oracle) = setup();

    let prices = oracle.get_tokens_with_prices(0, 5);
    assert(prices == array![], 'wrong prices array');

    let token1 = contract_address_const::<111>();
    let price1 = Price { min: 10, max: 11 };
    let token2 = contract_address_const::<222>();
    let price2 = Price { min: 20, max: 22 };
    let token3 = contract_address_const::<333>();
    let price3 = Price { min: 30, max: 33 };

    oracle.set_primary_price(token1, price1);
    oracle.set_primary_price(token2, price2);
    oracle.set_primary_price(token3, price3);

    let prices = oracle.get_tokens_with_prices(0, 0);
    assert(prices == array![], 'wrong prices array 0-0');
    let prices = oracle.get_tokens_with_prices(0, 1);
    assert(prices == array![token1], 'wrong prices array 0-1');
    let prices = oracle.get_tokens_with_prices(0, 2);
    assert(prices == array![token1, token2], 'wrong prices array 0-2');
    let prices = oracle.get_tokens_with_prices(0, 3);
    assert(prices == array![token1, token2, token3], 'wrong prices array 0-3');
    let prices = oracle.get_tokens_with_prices(0, 5);
    assert(prices == array![token1, token2, token3], 'wrong prices array 0-5');
    let prices = oracle.get_tokens_with_prices(1, 3);
    assert(prices == array![token2, token3], 'wrong prices array 1-3');
    let prices = oracle.get_tokens_with_prices(1, 5);
    assert(prices == array![token2, token3], 'wrong prices array 1-5');
    let prices = oracle.get_tokens_with_prices(2, 3);
    assert(prices == array![token3], 'wrong prices array 2-3');
    let prices = oracle.get_tokens_with_prices(2, 5);
    assert(prices == array![token3], 'wrong prices array 2-5');
    // teardown
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_get_primary_price_then_works() {
    let (_data_store, oracle) = setup();

    let token1 = contract_address_const::<'ETH'>();
    let price1 = Price { min: 10, max: 11 };
    let token2 = contract_address_const::<'USDC'>();
    let price2 = Price { min: 20, max: 22 };
    let token3 = contract_address_const::<'DAI'>();
    let price3 = Price { min: 30, max: 33 };

    oracle.set_primary_price(token1, price1);
    oracle.set_primary_price(token2, price2);
    oracle.set_primary_price(token3, price3);
    assert(is_price_eq(oracle.get_primary_price(token1), price1), 'wrong price token-1');
    assert(is_price_eq(oracle.get_primary_price(token2), price2), 'wrong price token-2');
    assert(is_price_eq(oracle.get_primary_price(token3), price3), 'wrong price token-3');
    // teardown
    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_price_feed_multiplier_then_works() {
    let (data_store, oracle) = setup();

    let token = contract_address_const::<'ETH'>();
    data_store.set_u256(keys::price_feed_multiplier_key(token), precision::FLOAT_PRECISION);

    oracle.get_price_feed_multiplier(data_store, token);
    // teardown
    tests_lib::teardown();
}

fn mock_set_prices_params() -> SetPricesParams {
    SetPricesParams {
        signer_info: 1,
        tokens: array![contract_address_const::<'ETH'>()],
        compacted_min_oracle_block_numbers: array![10],
        compacted_max_oracle_block_numbers: array![20],
        compacted_oracle_timestamps: array![1000],
        compacted_decimals: array![18, 18, 18],
        compacted_min_prices: array![99999],
        compacted_min_prices_indexes: array![0],
        compacted_max_prices: array![888888],
        compacted_max_prices_indexes: array![0],
        signatures: array![array!['signatures1', 'signatures2'].span()],
        price_feed_tokens: array![],
    }
}

fn is_price_eq(lhs: Price, rhs: Price) -> bool {
    lhs.min == rhs.min && lhs.max == rhs.max
}
