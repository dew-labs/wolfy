use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const};
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_mock_call, stop_mock_call, ContractClassTrait
};
use satoru::utils::span32::{Span32, Span32Trait};
use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::exchange::withdrawal_handler::{IWithdrawalHandlerDispatcher, IWithdrawalHandlerDispatcherTrait};
use satoru::withdrawal::withdrawal_vault::{IWithdrawalVaultDispatcher, IWithdrawalVaultDispatcherTrait};
use satoru::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use satoru::fee::fee_handler::{IFeeHandlerDispatcher, IFeeHandlerDispatcherTrait};
use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::data::keys;
use satoru::oracle::oracle_utils::{SetPricesParams, SimulatePricesParams};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::role::role;
use satoru::withdrawal::withdrawal_utils::CreateWithdrawalParams;
use satoru::withdrawal::withdrawal::Withdrawal;
use satoru::market::market::Market;
use traits::Default;
use satoru::test_utils::tests_lib;

// This tests check withdrawal creation under normal condition
// It calls withdrawal_handler.create_withdrawal
// The test expects the call to succeed without error
#[test]
fn given_normal_conditions_when_create_withdrawal_then_works() {
    let (caller_address, data_store, _event_emitter, withdrawal_handler, withdrawal_vault, _) = setup();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller_address);

    let account = contract_address_const::<'account'>();
    let market_token = contract_address_const::<'market_token'>();
    let params = create_withrawal_params(market_token);

    let address_zero = contract_address_const::<0>();

    let mut market = Market {
        market_token: market_token, index_token: address_zero, long_token: address_zero, short_token: address_zero,
    };

    data_store.set_market(market_token, 0, market);
    start_mock_call(withdrawal_vault.contract_address, 'record_transfer_in', 1_u256);
    let key = withdrawal_handler.create_withdrawal(account, params);

    //check withdrawal datas created
    let withdrawal = data_store.get_withdrawal(key);
    assert(withdrawal.key == key, 'Invalid withdrawal key');
    assert(withdrawal.account == account, 'Invalid withdrawal account');
}

// This tests check withdrawal creation when market_token_amount is 0
// It calls withdrawal_handler.create_withdrawal
// The test expects the call to panic with error empty withdrawal amount
#[test]
#[should_panic(expected: ('empty withdrawal amount',))]
fn given_market_token_amount_equal_zero_when_create_withdrawal_then_fails() {
    let (caller_address, _data_store, _event_emitter, withdrawal_handler, _withdrawal_vault, _) = setup();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller_address);

    let account = contract_address_const::<'account'>();
    let market_token = contract_address_const::<'market_token'>();
    let params = create_withrawal_params(market_token);

    withdrawal_handler.create_withdrawal(account, params);
}

// This tests check withdrawal creation when fee token amount is lower than execution fee
// It calls withdrawal_handler.create_withdrawal
// The test expects the call to panic with the error 'insufficient fee token amout'
#[test]
#[should_panic(expected: ('insufficient fee token amout', 0, 1))]
fn given_fee_token_lower_than_execution_fee_conditions_when_create_withdrawal_then_fails() {
    let (caller_address, _data_store, _event_emitter, withdrawal_handler, _, _) = setup();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller_address);

    let account = contract_address_const::<'account'>();
    let market_token = contract_address_const::<'market_token'>();
    let mut params = create_withrawal_params(market_token);
    params.execution_fee = 1;

    withdrawal_handler.create_withdrawal(account, params);
}

// This tests check withdrawal creation when caller address doesn't meet controller role
// It calls withdrawal_handler.create_withdrawal
// The test expects the call to panic with the error 'unauthorized_access'.
#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_not_controller_when_create_withdrawal_then_fails() {
    // Should revert, call from anyone else then controller.
    let (_caller_address, _data_store, _event_emitter, withdrawal_handler, _, _) = setup();
    let caller: ContractAddress = 0x847.try_into().unwrap();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller);

    let key = contract_address_const::<'market'>();

    let params = create_withrawal_params(key);

    withdrawal_handler.create_withdrawal(caller, params);
}

// This test checks withdrawal cancellation under normal condition
// It calls withdrawal_handler.cancel_withdrawal
// The test expects the call to succeed without error
#[test]
fn given_normal_conditions_when_cancel_withdrawal_then_works() {
    let (caller_address, data_store, _event_emitter, withdrawal_handler, withdrawal_vault, _) = setup();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller_address);

    let account = contract_address_const::<'account'>();
    let key = contract_address_const::<'market'>();

    let market = Market {
        market_token: key,
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };

    data_store.set_market(key, 0, market);

    let params = create_withrawal_params(key);
    start_mock_call(withdrawal_vault.contract_address, 'record_transfer_in', 1_u256);

    let withdrawal_key = withdrawal_handler.create_withdrawal(account, params);

    start_mock_call(
        withdrawal_vault.contract_address,
        'transfer_out',
        array![contract_address_const::<'market_token'>().into(), account.into(), '1']
    );
    // Key cleaning should be done in withdrawal_utils. We only check call here.
    withdrawal_handler.cancel_withdrawal(withdrawal_key);

    //check withdrawal correctly removed
    let address_zero = contract_address_const::<0>();
    let withdrawal = data_store.get_withdrawal(withdrawal_key);

    assert(withdrawal.key == 0, 'Invalid key');
    assert(withdrawal.account == address_zero, 'Invalid account');
    assert(withdrawal.receiver == address_zero, 'Invalid receiver');
    assert(withdrawal.callback_contract == address_zero, 'Invalid callback after');
    assert(withdrawal.ui_fee_receiver == address_zero, 'Invalid ui_fee_receiver');
    assert(withdrawal.long_token_swap_path.len() == 0, 'Invalid long_swap_path');
    assert(withdrawal.short_token_swap_path.len() == 0, 'Invalid short_swap_path');
    assert(withdrawal.market_token_amount == 0, 'Invalid market_token_amount');
    assert(withdrawal.min_long_token_amount == 0, 'Invalid long_token_amount');
    assert(withdrawal.min_short_token_amount == 0, 'Invalid short_token_amount');
    assert(withdrawal.updated_at_block == 0, 'Invalid block');
    assert(withdrawal.execution_fee == 0, 'Invalid execution_fee');
    assert(withdrawal.callback_gas_limit == 0, 'Invalid callback_gas_limit');
}

// This tests check withdrawal cancellation when key doesn't exist in store
// It calls withdrawal_handler.cancel_withdrawal
// The test expects the call to panic with the error 'get_withdrawal failed'.
#[test]
#[should_panic(expected: ('empty withdrawal',))]
fn given_unexisting_key_when_cancel_withdrawal_then_fails() {
    let (caller_address, _data_store, _event_emitter, withdrawal_handler, _, _) = setup();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller_address);

    let withdrawal_key = 'SAMPLE_WITHDRAW';

    // Key cleaning should be done in withdrawal_utils. We only check call here.
    withdrawal_handler.cancel_withdrawal(withdrawal_key);
}

// This tests check withdrawal cancellation when account address is 0
// It calls withdrawal_handler.cancel_withdrawal
// The test expects the call to panic with the error 'empty withdrawal'.
#[test]
#[should_panic(expected: ('empty withdrawal',))]
fn given_account_address_zero_when_cancel_withdrawal_then_fails() {
    let mut withdrawal = Withdrawal {
        key: 0,
        account: contract_address_const::<0>(),
        receiver: contract_address_const::<0>(),
        callback_contract: contract_address_const::<0>(),
        ui_fee_receiver: contract_address_const::<0>(),
        market: contract_address_const::<0>(),
        long_token_swap_path: Default::default(),
        short_token_swap_path: Default::default(),
        market_token_amount: 0,
        min_long_token_amount: 0,
        min_short_token_amount: 0,
        updated_at_block: 0,
        execution_fee: 0,
        callback_gas_limit: 0,
    };

    let (caller_address, data_store, _event_emitter, withdrawal_handler, withdrawal_vault, _) = setup();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller_address);

    let account = contract_address_const::<'account'>();
    let key = contract_address_const::<'market'>();
    let mut params = create_withrawal_params(key);

    let market = Market {
        market_token: key,
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };

    data_store.set_market(key, 0, market);

    start_mock_call(withdrawal_vault.contract_address, 'record_transfer_in', 1_u256);

    let withdrawal_key = withdrawal_handler.create_withdrawal(account, params);

    start_mock_call(data_store.contract_address, 'get_withdrawal', withdrawal);

    // Key cleaning should be done in withdrawal_utils. We only check call here.
    withdrawal_handler.cancel_withdrawal(withdrawal_key);
}


// This tests check withdrawal cancellation when market token amount is 0
// It calls withdrawal_handler.cancel_withdrawal
// The test expects the call to panic with the error 'empty withdrawal'.
#[test]
#[should_panic(expected: ('empty withdrawal amount',))]
fn given_market_token_equals_zero_when_cancel_withdrawal_then_fails() {
    let mut withdrawal = Withdrawal {
        key: 0,
        account: contract_address_const::<'account'>(),
        receiver: contract_address_const::<0>(),
        callback_contract: contract_address_const::<0>(),
        ui_fee_receiver: contract_address_const::<0>(),
        market: contract_address_const::<0>(),
        long_token_swap_path: Default::default(),
        short_token_swap_path: Default::default(),
        market_token_amount: 0,
        min_long_token_amount: 0,
        min_short_token_amount: 0,
        updated_at_block: 0,
        execution_fee: 0,
        callback_gas_limit: 0,
    };

    let (caller_address, data_store, _event_emitter, withdrawal_handler, withdrawal_vault, _) = setup();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller_address);

    let account = contract_address_const::<'account'>();
    let key = contract_address_const::<'market'>();
    let mut params = create_withrawal_params(key);

    let market = Market {
        market_token: key,
        index_token: contract_address_const::<'index_token'>(),
        long_token: contract_address_const::<'long_token'>(),
        short_token: contract_address_const::<'short_token'>(),
    };

    data_store.set_market(key, 0, market);

    start_mock_call(withdrawal_vault.contract_address, 'record_transfer_in', 1_u256);

    let withdrawal_key = withdrawal_handler.create_withdrawal(account, params);

    stop_mock_call(withdrawal_vault.contract_address, 'record_transfer_in');
    start_mock_call(data_store.contract_address, 'get_withdrawal', withdrawal);

    // Key cleaning should be done in withdrawal_utils. We only check call here.
    withdrawal_handler.cancel_withdrawal(withdrawal_key);
}

// This tests check withdrawal execution when caller address doesn't meet controller role
// It calls withdrawal_handler.execute_withdrawal
// The test expects the call to panic with the error 'unauthorized_access'.
#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_not_keeper_when_execute_withdrawal_then_fails() {
    let oracle_params = SetPricesParams {
        signer_info: Default::default(),
        tokens: Default::default(),
        compacted_min_oracle_block_numbers: Default::default(),
        compacted_max_oracle_block_numbers: Default::default(),
        compacted_oracle_timestamps: Default::default(),
        compacted_decimals: Default::default(),
        compacted_min_prices: Default::default(),
        compacted_min_prices_indexes: Default::default(),
        compacted_max_prices: Default::default(),
        compacted_max_prices_indexes: Default::default(),
        signatures: Default::default(),
        price_feed_tokens: Default::default(),
    };

    let (_caller_address, _data_store, _event_emitter, withdrawal_handler, _, _) = setup();

    let withdrawal_key = 'SAMPLE_WITHDRAW';

    withdrawal_handler.execute_withdrawal(withdrawal_key, oracle_params);
}

#[test]
#[should_panic(expected: ('withdrawal not found',))]
fn given_invalid_withdrawal_key_when_execute_withdrawal_then_fails() {
    let oracle_params = SetPricesParams {
        signer_info: Default::default(),
        tokens: Default::default(),
        compacted_min_oracle_block_numbers: Default::default(),
        compacted_max_oracle_block_numbers: Default::default(),
        compacted_oracle_timestamps: Default::default(),
        compacted_decimals: Default::default(),
        compacted_min_prices: Default::default(),
        compacted_min_prices_indexes: Default::default(),
        compacted_max_prices: Default::default(),
        compacted_max_prices_indexes: Default::default(),
        signatures: Default::default(),
        price_feed_tokens: Default::default(),
    };

    let (_caller_address, _data_store, _event_emitter, withdrawal_handler, _, role_store) = setup();

    let keeper_address = contract_address_const::<'keeper'>();

    role_store.grant_role(keeper_address, role::ORDER_KEEPER);
    start_cheat_caller_address(withdrawal_handler.contract_address, keeper_address);

    let withdrawal_key = 'SAMPLE_WITHDRAW';

    withdrawal_handler.execute_withdrawal(withdrawal_key, oracle_params);
}

// This tests check withdrawal simulation when when caller address doesn't meet controller role
// It calls withdrawal_handler.simulate_execute_withdrawal
// The test expects the call to panic with the error 'unauthorized_access'.
#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_not_controller_when_simulate_execute_withdrawal_then_fails() {
    let (_caller_address, _data_store, _event_emitter, withdrawal_handler, _, _) = setup();
    let caller: ContractAddress = contract_address_const::<0x847>();
    start_cheat_caller_address(withdrawal_handler.contract_address, caller);

    let oracle_params = SimulatePricesParams {
        primary_tokens: Default::default(), primary_prices: Default::default(),
    };

    let withdrawal_key = 'SAMPLE_WITHDRAW';

    withdrawal_handler.simulate_execute_withdrawal(withdrawal_key, oracle_params);
}

// This tests check withdrawal simulation when key is unknown
// It calls withdrawal_handler.simulate_execute_withdrawal
// The test expects the call to panic with the error 'invalid withdrawal key','SAMPLE_WITHDRAW'.
#[test]
#[should_panic(expected: ('withdrawal not found',))]
fn given_invalid_withdrawal_key_when_simulate_execute_withdrawal_then_fails() {
    let (caller_address, _data_store, _event_emitter, withdrawal_handler, _, _) = setup();
    let oracle_params = SimulatePricesParams {
        primary_tokens: Default::default(), primary_prices: Default::default(),
    };

    start_cheat_caller_address(withdrawal_handler.contract_address, caller_address);

    let withdrawal_key = 'SAMPLE_WITHDRAW';

    withdrawal_handler.simulate_execute_withdrawal(withdrawal_key, oracle_params);
}

fn create_withrawal_params(market: ContractAddress) -> CreateWithdrawalParams {
    CreateWithdrawalParams {
        receiver: contract_address_const::<'receiver'>(),
        callback_contract: contract_address_const::<'callback_contract'>(),
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
        market,
        long_token_swap_path: Default::default(),
        short_token_swap_path: Default::default(),
        min_long_token_amount: Default::default(),
        min_short_token_amount: Default::default(),
        execution_fee: Default::default(),
        callback_gas_limit: Default::default(),
    }
}

fn setup() -> (
    ContractAddress, IDataStoreDispatcher, IEventEmitterDispatcher, IWithdrawalHandlerDispatcher, IWithdrawalVaultDispatcher, IRoleStoreDispatcher
) {
let (
        caller_address,
        _market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
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
        _referral_storage,
        withdrawal_handler,
        withdrawal_vault,
        _liquidation_handler,
        _,
        _,
        _,
        _,
    ) = tests_lib::setup();

    (caller_address, data_store, event_emitter, withdrawal_handler, withdrawal_vault, role_store)
}
