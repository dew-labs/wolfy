// Core lib imports.
use array::ArrayTrait;
use core::traits::{Into, TryInto};

use debug::PrintTrait;

// Local imports.
use freyr::data::{data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait}, keys};
use freyr::event::event_emitter::IEventEmitterDispatcher;
use freyr::market::market::Market;
use freyr::market::market_utils::{IMarketUtilsDispatcherTrait, IMarketUtilsLibraryDispatcher, MarketPrices};
use freyr::mock::referral_storage::IReferralStorageDispatcher;
use freyr::oracle::oracle::IOracleDispatcher;
use freyr::order::{
    base_order_utils::{ExecuteOrderParams, ExecuteOrderParamsContracts},
    order::{DecreasePositionSwapType, Order, OrderType, SecondaryOrderType}, order_vault::IOrderVaultDispatcher,
};
use freyr::position::{
    decrease_position_collateral_utils, position::Position,
    position_utils::{DecreasePositionCache, DecreasePositionCollateralValues, UpdatePositionParams},
};
use freyr::price::price::Price;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::swap::swap_handler::ISwapHandlerDispatcher;
use freyr::test_utils::tests_lib;
use freyr::utils::span32::{Array32Trait, Span32};
use snforge_std::{ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address};
use starknet::{ContractAddress, contract_address_const};

fn setup() -> (
    ContractAddress,
    IRoleStoreDispatcher,
    IDataStoreDispatcher,
    IEventEmitterDispatcher,
    IReferralStorageDispatcher,
    ISwapHandlerDispatcher,
    IMarketUtilsLibraryDispatcher,
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
        market_utils_class,
        _market_factory,
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
        referral_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        swap_handler,
        _,
        _,
    ) =
        tests_lib::setup();

    let market_utils = IMarketUtilsLibraryDispatcher { class_hash: market_utils_class.class_hash };

    (caller_address, role_store, data_store, event_emitter, referral_storage, swap_handler, market_utils)
}

fn deploy_token() -> ContractAddress {
    let contract = declare("ERC20").unwrap().contract_class();
    let constructor_calldata: Array<felt252> = array!['Test', 'TST', 18, 1000000, 0, 0x101];
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    contract_address
}

#[test]
fn given_good_params_when_process_collateral_then_succeed() {
    //
    // Setup
    //
    let (_caller_address, _role_store, data_store, event_emitter, referral_storage, swap_handler, market_utils) =
        setup();
    let long_token_address = deploy_token();

    // setting open_interest to 10_000 to allow decreasing position.
    data_store
        .set_u256(
            keys::open_interest_key(contract_address_const::<'market_token'>(), long_token_address, true), 10_000,
        );

    let params = create_new_update_position_params(
        DecreasePositionSwapType::SwapCollateralTokenToPnlToken,
        swap_handler,
        data_store.contract_address,
        event_emitter.contract_address,
        referral_storage.contract_address,
        long_token_address,
    );

    let values = create_new_decrease_position_cache(long_token_address);

    //
    // Execution
    //
    decrease_position_collateral_utils::process_collateral(params, values, market_utils);

    // Checks
    data_store.get_u256(keys::open_interest_key(contract_address_const::<'market_token'>(), long_token_address, true));
}

#[test]
fn given_good_params_get_execution_price_then_succeed() {
    //
    // Setup
    //
    let (_caller_address, _role_store, data_store, event_emitter, referral_storage, swap_handler, market_utils) =
        setup();
    let long_token_address = deploy_token();

    // setting open_interest to 10_000 to allow decreasing position.
    data_store
        .set_u256(
            keys::open_interest_key(contract_address_const::<'market_token'>(), long_token_address, true), 10_000,
        );

    let params = create_new_update_position_params(
        DecreasePositionSwapType::SwapCollateralTokenToPnlToken,
        swap_handler,
        data_store.contract_address,
        event_emitter.contract_address,
        referral_storage.contract_address,
        long_token_address,
    );

    //
    // Execution
    //
    let (_, _, execution_price) = decrease_position_collateral_utils::get_execution_price(
        params, Price { min: 10, max: 10 }, market_utils,
    );
    //
    // Checks
    //
    assert(execution_price > 0, 'no execution price');
    tests_lib::teardown();
}

/// Utility function to create new UpdatePositionParams struct
fn create_new_update_position_params(
    decrease_position_swap_type: DecreasePositionSwapType,
    swap_handler: ISwapHandlerDispatcher,
    data_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    referral_storage_address: ContractAddress,
    long_token_address: ContractAddress,
) -> UpdatePositionParams {
    let order_vault = tests_lib::get_order_vault_address();
    let oracle = tests_lib::get_oracle_address();
    let contracts = ExecuteOrderParamsContracts {
        data_store: IDataStoreDispatcher { contract_address: data_store_address },
        event_emitter: IEventEmitterDispatcher { contract_address: event_emitter_address },
        order_vault: IOrderVaultDispatcher { contract_address: order_vault },
        oracle: IOracleDispatcher { contract_address: oracle },
        swap_handler,
        referral_storage: IReferralStorageDispatcher { contract_address: referral_storage_address },
    };

    let market = Market {
        market_token: contract_address_const::<'market_token'>(),
        index_token: long_token_address,
        long_token: long_token_address,
        short_token: contract_address_const::<'short_token'>(),
    };

    let order = Order {
        key: 123456789,
        order_type: OrderType::StopLossDecrease,
        decrease_position_swap_type,
        account: contract_address_const::<'account'>(),
        receiver: contract_address_const::<'receiver'>(),
        callback_contract: contract_address_const::<'callback_contract'>(),
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
        market: contract_address_const::<'market'>(),
        initial_collateral_token: contract_address_const::<'token1'>(),
        swap_path: array![contract_address_const::<'swap_path_0'>(), contract_address_const::<'swap_path_1'>()]
            .span32(),
        size_delta_usd: 1000,
        initial_collateral_delta_amount: 1000,
        trigger_price: 11111,
        acceptable_price: 11111,
        execution_fee: 10,
        callback_gas_limit: 300000,
        min_output_amount: 10,
        updated_at_block: 1,
        is_long: true,
        is_frozen: false,
    };

    let position = Position {
        key: 123456789,
        account: contract_address_const::<'account'>(),
        market: contract_address_const::<'market'>(),
        collateral_token: contract_address_const::<'collateral_token'>(),
        size_in_usd: 1000,
        size_in_tokens: 1000,
        collateral_amount: 1000,
        borrowing_factor: 1,
        funding_fee_amount_per_size: 1,
        long_token_claimable_funding_amount_per_size: 10,
        short_token_claimable_funding_amount_per_size: 10,
        increased_at_block: 1,
        decreased_at_block: 3,
        is_long: false,
    };

    let params = UpdatePositionParams {
        contracts,
        market,
        order,
        order_key: 123456789,
        position,
        position_key: 123456789,
        secondary_order_type: SecondaryOrderType::None,
    };

    params
}

/// Utility function to create new DecreasePositionCache struct
fn create_new_decrease_position_cache(long_token_address: ContractAddress) -> DecreasePositionCache {
    let price = Price { min: 1, max: 1 };
    DecreasePositionCache {
        prices: MarketPrices { index_token_price: price, long_token_price: price, short_token_price: price },
        estimated_position_pnl_usd: 100.into(),
        estimated_realized_pnl_usd: 0.into(),
        estimated_remaining_pnl_usd: 100.into(),
        pnl_token: long_token_address,
        pnl_token_price: price,
        collateral_token_price: price,
        initial_collateral_amount: 100.into(),
        next_position_size_in_usd: 500.into(),
        next_position_borrowing_factor: 100000.into(),
    }
}
