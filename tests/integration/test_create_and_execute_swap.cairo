//! Test file for `src/exchange/base_order_handler.cairo`.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************
// Core lib imports.
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const};
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_mock_call, test_address, ContractClassTrait,
    ContractClass, start_cheat_block_number
};
use traits::Default;
use poseidon::poseidon_hash_span;
use debug::PrintTrait;
// Local imports.
use satoru::role::role;
use satoru::test_utils::tests_lib;

use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::data::keys;
use satoru::order::order::{Order, OrderType, SecondaryOrderType, DecreasePositionSwapType};
use satoru::order::order_vault::{IOrderVaultDispatcher, IOrderVaultDispatcherTrait};
use satoru::order::base_order_utils::{CreateOrderParams};
use satoru::oracle::oracle_store::{IOracleStoreDispatcher, IOracleStoreDispatcherTrait};
use satoru::oracle::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
use satoru::oracle::oracle_utils::SetPricesParams;
use satoru::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
use satoru::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
use satoru::utils::span32::{Span32, Array32Trait};
use satoru::market::{
    market::{Market, UniqueIdMarketImpl}, market_factory::{IMarketFactoryDispatcher, IMarketFactoryDispatcherTrait}
};
use satoru::exchange::order_handler::{OrderHandler, IOrderHandlerDispatcher, IOrderHandlerDispatcherTrait};
use satoru::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

// *********************************************************************************************
// *                                      TESTS                                                *
// *********************************************************************************************
#[test]
fn given_right_swap_order_params_when_execute_order_then_success() {
    // Setup
    let (
        caller_address,
        _role_store,
        data_store,
        _event_emitter,
        order_vault,
        _oracle,
        _referral_storage,
        order_handler,
        market_factory
    ) =
        setup_contracts();
    let contract_address = contract_address_const::<0>();
    // Test
    // Create market.
    let market = data_store.get_market(tests_lib::create_market(market_factory));

    // Transfer tokens in the order_vault in order for initial_collateral_delta_amount to be non zero.
    start_cheat_caller_address(contract_address_const::<'ETH'>(), caller_address);
    start_cheat_caller_address(contract_address_const::<'USDC'>(), caller_address);
    IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .transfer(order_vault.contract_address, 5000000000000000000000000000000);
    // IERC20Dispatcher {contract_address: contract_address_const::<'USDC'>()}
    //     .transfer(order_vault.contract_address, 5000000000000000000000000000000);

    // Fill the pool.
    IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .transfer(market.market_token, 100000000000000000000000000000);
    IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() }
        .transfer(market.market_token, 300000000000000000000000000000000);

    // Set pool amount in data_store.
    let mut key = keys::pool_amount_key(market.market_token, contract_address_const::<'ETH'>());
    data_store.set_u256(key, 100000000000000000000000000000);
    key = keys::pool_amount_key(market.market_token, contract_address_const::<'USDC'>());
    data_store.set_u256(key, 300000000000000000000000000000000);

    // Set max pool amount.
    data_store
        .set_u256(
            keys::max_pool_amount_key(market.market_token, contract_address_const::<'USDC'>()),
            5000000000000000000000000000000000000
        );
    data_store
        .set_u256(
            keys::max_pool_amount_key(market.market_token, contract_address_const::<'ETH'>()),
            5000000000000000000000000000000000000
        );
    // Set params in data_store.
    data_store.set_address(keys::fee_token(), market.index_token);
    data_store.set_u256(keys::max_swap_path_length(), 5);

    start_cheat_caller_address(market.long_token, caller_address);
    let order_params = CreateOrderParams {
        receiver: caller_address,
        callback_contract: contract_address,
        ui_fee_receiver: contract_address,
        market: contract_address,
        initial_collateral_token: market.long_token,
        swap_path: Array32Trait::<ContractAddress>::span32(@array![market.market_token]),
        size_delta_usd: 1000,
        initial_collateral_delta_amount: 5000000000000000000000000000000, // 10^18
        trigger_price: 0,
        acceptable_price: 0,
        execution_fee: 0,
        callback_gas_limit: 0,
        min_output_amount: 0,
        order_type: OrderType::MarketSwap(()),
        decrease_position_swap_type: DecreasePositionSwapType::NoSwap(()),
        is_long: false,
        referral_code: 0
    };
    // Create the swap order.
    start_cheat_block_number(order_handler.contract_address, 1910);
    let _key = order_handler.create_order(caller_address, order_params);

    // data_store.set_u256(keys::pool_amount_key(market.market_token, contract_address_const::<'USDC'>()), );
    // data_store.set_u256(keys::pool_amount_key(market.market_token, contract_address_const::<'ETH'>()), 1000000);
    // Execute the swap order.
    let _signatures: Span<felt252> = array![0].span();
    let _set_price_params = SetPricesParams {
        signer_info: 1,
        tokens: array![contract_address_const::<'ETH'>(), contract_address_const::<'USDC'>()],
        compacted_min_oracle_block_numbers: array![1900, 1900],
        compacted_max_oracle_block_numbers: array![1910, 1910],
        compacted_oracle_timestamps: array![9999, 9999],
        compacted_decimals: array![1, 1],
        compacted_min_prices: array![2147483648010000], // 500000, 10000 compacted
        compacted_min_prices_indexes: array![0],
        compacted_max_prices: array![2147483648010000], // 500000, 10000 compacted
        compacted_max_prices_indexes: array![0],
        signatures: array![array!['signatures1', 'signatures2'].span(), array!['signatures1', 'signatures2'].span()],
        price_feed_tokens: array![]
    };
    start_cheat_caller_address(order_handler.contract_address, caller_address);
    start_cheat_block_number(order_handler.contract_address, 1915);
    // TODO add real signatures check on Oracle Account
    //order_handler.execute_order(key, set_price_params);

    // Teardown
    tests_lib::teardown();
}

// *********************************************************************************************
// *                                      SETUP                                                *
// *********************************************************************************************

/// Utility function to setup the test environment.
fn setup_contracts() -> (
    ContractAddress,
    IRoleStoreDispatcher,
    IDataStoreDispatcher,
    IEventEmitterDispatcher,
    IOrderVaultDispatcher,
    IOracleDispatcher,
    IReferralStorageDispatcher,
    IOrderHandlerDispatcher,
    IMarketFactoryDispatcher
) {
    let (
        caller_address,
        _market_token_class,
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
        oracle,
        order_handler,
        order_vault,
        _reader,
        referral_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        _,
        _,
        _,
        _,
    ) = tests_lib::setup();

    return (
        caller_address,
        role_store,
        data_store,
        event_emitter,
        order_vault,
        oracle,
        referral_storage,
        order_handler,
        market_factory
    );
}
