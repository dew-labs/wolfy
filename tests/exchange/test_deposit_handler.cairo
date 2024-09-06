use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait, ContractClass};
use starknet::{ContractAddress, contract_address_const, ClassHash, Felt252TryIntoContractAddress};
use traits::Default;

use satoru::deposit::deposit_utils::CreateDepositParams;
use satoru::oracle::oracle_utils::SetPricesParams;
use satoru::exchange::deposit_handler::{IDepositHandlerDispatcher, IDepositHandlerDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::role::role;
use satoru::role::role_module::{IRoleModuleDispatcher, IRoleModuleDispatcherTrait};
use satoru::utils::span32::{Span32, Array32Trait};
use satoru::test_utils::tests_lib;

// TODO add assert and tests when deposit_vault will be implemented

#[test]
fn given_normal_conditions_when_create_cancel_deposit_then_works() {
    let deposit_handler = setup();

    let account = contract_address_const::<'account'>();
    let params = create_deposit_params();
    let key = deposit_handler.create_deposit(account, params);
    deposit_handler.cancel_deposit(key);
}

#[test]
fn given_normal_conditions_when_create_execute_deposit_then_works() {
    let deposit_handler = setup();

    let account = contract_address_const::<'account'>();
    let params = create_deposit_params();

    let key = deposit_handler.create_deposit(account, params);

    let token1 = contract_address_const::<'token1'>();
    let price_feed_tokens1 = contract_address_const::<'price_feed_tokens'>();
    let oracle_params = SetPricesParams {
        signer_info: 123,
        tokens: array![token1],
        compacted_min_oracle_block_numbers: array![1],
        compacted_max_oracle_block_numbers: array![10],
        compacted_oracle_timestamps: array![1123],
        compacted_decimals: array![18],
        compacted_min_prices: array![2],
        compacted_min_prices_indexes: array![1],
        compacted_max_prices: array![5],
        compacted_max_prices_indexes: array![1],
        signatures: array![array!['signatures'].span()],
        price_feed_tokens: array![price_feed_tokens1],
    };

    deposit_handler.execute_deposit(key, oracle_params);
}

fn create_deposit_params() -> CreateDepositParams {
    CreateDepositParams {
        receiver: contract_address_const::<'receiver'>(),
        callback_contract: contract_address_const::<'callback_contract'>(),
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
        market: contract_address_const::<'market'>(),
        initial_long_token: contract_address_const::<'initial_long_token'>(),
        initial_short_token: contract_address_const::<'initial_short_token'>(),
        long_token_swap_path: Array32Trait::<ContractAddress>::span32(@ArrayTrait::new()),
        short_token_swap_path: Array32Trait::<ContractAddress>::span32(@ArrayTrait::new()),
        min_market_tokens: 10,
        execution_fee: 0,
        callback_gas_limit: 10,
    }
}

fn setup() -> IDepositHandlerDispatcher {
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
        _role_store,
        _data_store,
        _event_emitter,
        _exchange_router,
        deposit_handler,
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
        _,
    ) =
        tests_lib::setup();
    deposit_handler
}
