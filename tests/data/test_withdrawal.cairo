use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const};
use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait, DeclareResultTrait};

use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::role::role;
use satoru::withdrawal::withdrawal::Withdrawal;
use satoru::utils::span32::{Span32, Array32Trait};
use satoru::test_utils::tests_lib;

/// Utility function to setup the test environment.
///
/// # Returns
///
/// * `ContractAddress` - The address of the caller.
/// * `IRoleStoreDispatcher` - The role store dispatcher.
/// * `IDataStoreDispatcher` - The data store dispatcher.
fn setup() -> (ContractAddress, IRoleStoreDispatcher, IDataStoreDispatcher) {
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
        _market_factory,
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
        _liquidation_handler,
        _,
        _,
        _,
        _,
    ) =
        tests_lib::setup();
    (caller_address, role_store, data_store)
}

#[test]
fn given_normal_conditions_when_set_withdrawal_new_and_override_then_works() {
    // Setup
    let (_caller_address, _role_store, data_store) = setup();
    let account = 'account'.try_into().unwrap();
    let long_token_swap_path: Span32<ContractAddress> = array![
        1.try_into().unwrap(), 2.try_into().unwrap(), 3.try_into().unwrap()
    ]
        .span32();
    let short_token_swap_path: Span32<ContractAddress> = array![
        4.try_into().unwrap(), 5.try_into().unwrap(), 6.try_into().unwrap()
    ]
        .span32();

    let key: felt252 = 123456789;
    let mut withdrawal = Withdrawal {
        key: key,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };

    // Test logic

    // Test set_withdrawal function with a new key.
    data_store.set_withdrawal(key, withdrawal);

    let withdrawal_by_key = data_store.get_withdrawal(key);
    assert(withdrawal_by_key == withdrawal, 'Invalid withdrawal by key');

    let account_withdrawal_count = data_store.get_account_withdrawal_count(account);
    assert(account_withdrawal_count == 1, 'Invalid account withdrawl count');

    let account_withdrawal_keys = data_store.get_account_withdrawal_keys(account, 0, 10);
    assert(account_withdrawal_keys.len() == 1, 'Acc withdrawal # should be 1');

    // Update the withdrawal using the set_withdrawal function and then retrieve it to check the update was successful
    let receiver = 'receiver'.try_into().unwrap();
    withdrawal.receiver = receiver;
    data_store.set_withdrawal(key, withdrawal);

    let withdrawal_by_key = data_store.get_withdrawal(key);
    assert(withdrawal_by_key == withdrawal, 'Invalid withdrawal by key');
    assert(withdrawal_by_key.receiver == receiver, 'Invalid withdrawal value');

    let account_withdrawal_count = data_store.get_account_withdrawal_count(account);
    assert(account_withdrawal_count == 1, 'Invalid account withdrawl count');

    let account_withdrawal_keys = data_store.get_account_withdrawal_keys(account, 0, 10);
    assert(account_withdrawal_keys.len() == 1, 'Acc withdrawal # should be 1');

    teardown(data_store);
}


#[test]
#[should_panic(expected: ('withdrawal account cant be 0',))]
fn given_withdrawal_account_0_when_set_withdrawal_then_fails() {
    // Setup
    let (_caller_address, _role_store, data_store) = setup();
    let account = contract_address_const::<0>();
    let long_token_swap_path: Span32<ContractAddress> = array![
        1.try_into().unwrap(), 2.try_into().unwrap(), 3.try_into().unwrap()
    ]
        .span32();
    let short_token_swap_path: Span32<ContractAddress> = array![
        4.try_into().unwrap(), 5.try_into().unwrap(), 6.try_into().unwrap()
    ]
        .span32();

    let key: felt252 = 123456789;
    let mut withdrawal = Withdrawal {
        key: key,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };

    // Test logic

    // Test set_withdrawal function with account 0
    data_store.set_withdrawal(key, withdrawal);

    teardown(data_store);
}


#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_not_controller_when_set_withdrawal_then_fails() {
    // Setup
    let (caller_address, role_store, data_store) = setup();
    role_store.revoke_role(caller_address, role::CONTROLLER);
    let account = 'account'.try_into().unwrap();
    let long_token_swap_path: Span32<ContractAddress> = array![
        1.try_into().unwrap(), 2.try_into().unwrap(), 3.try_into().unwrap()
    ]
        .span32();
    let short_token_swap_path: Span32<ContractAddress> = array![
        4.try_into().unwrap(), 5.try_into().unwrap(), 6.try_into().unwrap()
    ]
        .span32();

    let key: felt252 = 123456789;
    let mut withdrawal = Withdrawal {
        key: key,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };

    // Test logic

    // Test set_withdrawal function without permission
    data_store.set_withdrawal(key, withdrawal);

    teardown(data_store);
}

#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_not_controller_when_get_withdrawal_keys_then_fails() {
    // Setup
    let (caller_address, role_store, data_store) = setup();
    let account = 'account'.try_into().unwrap();
    role_store.revoke_role(caller_address, role::CONTROLLER);
    let long_token_swap_path: Span32<ContractAddress> = array![
        1.try_into().unwrap(), 2.try_into().unwrap(), 3.try_into().unwrap()
    ]
        .span32();
    let short_token_swap_path: Span32<ContractAddress> = array![
        4.try_into().unwrap(), 5.try_into().unwrap(), 6.try_into().unwrap()
    ]
        .span32();

    let key: felt252 = 123456789;
    let mut withdrawal = Withdrawal {
        key: key,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };
    data_store.set_withdrawal(key, withdrawal);

    // Given
    data_store.remove_withdrawal(key, account);

    // Then
    let withdrawal_by_key = data_store.get_withdrawal(key);
    assert(withdrawal_by_key.account.is_zero(), 'withdrawal should be removed');
    let account_withdrawal_count = data_store.get_account_withdrawal_count(account);
    assert(account_withdrawal_count == 0, 'Acc withdrawal # should be 0');
    let account_withdrawal_keys = data_store.get_account_withdrawal_keys(account, 0, 10);
    assert(account_withdrawal_keys.len() == 0, 'Acc withdraw # not empty');

    teardown(data_store);
}

#[test]
fn given_normal_conditions_when_remove_only_withdrawal_then_works() {
    // Setup
    let (_caller_address, _role_store, data_store) = setup();
    let account = 'account'.try_into().unwrap();
    let long_token_swap_path: Span32<ContractAddress> = array![
        1.try_into().unwrap(), 2.try_into().unwrap(), 3.try_into().unwrap()
    ]
        .span32();
    let short_token_swap_path: Span32<ContractAddress> = array![
        4.try_into().unwrap(), 5.try_into().unwrap(), 6.try_into().unwrap()
    ]
        .span32();

    let key: felt252 = 123456789;
    let mut withdrawal = Withdrawal {
        key: key,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };

    data_store.set_withdrawal(key, withdrawal);

    // Given
    data_store.remove_withdrawal(key, account);

    // Then
    let withdrawal_by_key = data_store.get_withdrawal(key);
    assert(withdrawal_by_key.account.is_zero(), 'withdrawal should be removed');

    let account_withdrawal_count = data_store.get_account_withdrawal_count(account);
    assert(account_withdrawal_count == 0, 'Acc withdrawal # should be 0');

    let account_withdrawal_keys = data_store.get_account_withdrawal_keys(account, 0, 10);
    assert(account_withdrawal_keys.len() == 0, 'Acc withdraw # not empty');

    teardown(data_store);
}

#[test]
fn given_normal_conditions_when_remove_1_of_n_withdrawal_then_works() {
    // Setup
    let (_caller_address, _role_store, data_store) = setup();
    let account = 'account'.try_into().unwrap();
    let long_token_swap_path: Span32<ContractAddress> = array![
        1.try_into().unwrap(), 2.try_into().unwrap(), 3.try_into().unwrap()
    ]
        .span32();
    let short_token_swap_path: Span32<ContractAddress> = array![
        4.try_into().unwrap(), 5.try_into().unwrap(), 6.try_into().unwrap()
    ]
        .span32();

    let key_1: felt252 = 123456789;
    let mut withdrawal_1 = Withdrawal {
        key: key_1,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };

    let key_2: felt252 = 987654321;
    let mut withdrawal_2 = Withdrawal {
        key: key_2,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };

    data_store.set_withdrawal(key_1, withdrawal_1);
    data_store.set_withdrawal(key_2, withdrawal_2);

    // Given
    data_store.remove_withdrawal(key_1, account);

    // Then
    let withdrawal_1_by_key = data_store.get_withdrawal(key_1);
    assert(withdrawal_1_by_key.account.is_zero(), 'withdrawal1 should be removed');

    let withdrawal_2_by_key = data_store.get_withdrawal(key_2);
    assert(withdrawal_2_by_key.account.is_non_zero(), 'withdrawal2 shouldnt be removed');

    let account_withdrawal_count = data_store.get_account_withdrawal_count(account);
    assert(account_withdrawal_count == 1, 'Acc withdrawal # should be 1');

    let account_withdrawal_keys = data_store.get_account_withdrawal_keys(account, 0, 10);
    assert(account_withdrawal_keys.len() == 1, 'Acc withdraw # not 1');

    teardown(data_store);
}

#[test]
fn given_normal_conditions_when_remove_last_withdrawal_then_works() {
    // Setup
    let (_caller_address, _role_store, data_store) = setup();
    let account = 'account'.try_into().unwrap();
    let long_token_swap_path: Span32<ContractAddress> = array![
        1.try_into().unwrap(), 2.try_into().unwrap(), 3.try_into().unwrap()
    ]
        .span32();
    let short_token_swap_path: Span32<ContractAddress> = array![
        4.try_into().unwrap(), 5.try_into().unwrap(), 6.try_into().unwrap()
    ]
        .span32();

    let key_1: felt252 = 123456789;
    let mut withdrawal_1 = Withdrawal {
        key: key_1,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };

    let key_2: felt252 = 987654321;
    let mut withdrawal_2 = Withdrawal {
        key: key_2,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };

    data_store.set_withdrawal(key_1, withdrawal_1);
    data_store.set_withdrawal(key_2, withdrawal_2);

    // Given
    data_store.remove_withdrawal(key_2, account);

    // Then
    let withdrawal_1_by_key = data_store.get_withdrawal(key_1);
    assert(withdrawal_1_by_key.account.is_non_zero(), 'withdrawal1 shouldnt be removed');

    let withdrawal_2_by_key = data_store.get_withdrawal(key_2);
    assert(withdrawal_2_by_key.account.is_zero(), 'withdrawal2 should be removed');

    let account_withdrawal_count = data_store.get_account_withdrawal_count(account);
    assert(account_withdrawal_count == 1, 'Acc withdrawal # should be 1');

    let account_withdrawal_keys = data_store.get_account_withdrawal_keys(account, 0, 10);
    assert(account_withdrawal_keys.len() == 1, 'Acc withdraw # not 1');

    teardown(data_store);
}


#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_not_controller_when_remove_withdrawal_then_fails() {
    // Setup
    let (caller_address, role_store, data_store) = setup();
    let account = 'account'.try_into().unwrap();
    role_store.revoke_role(caller_address, role::CONTROLLER);
    let long_token_swap_path: Span32<ContractAddress> = array![
        1.try_into().unwrap(), 2.try_into().unwrap(), 3.try_into().unwrap()
    ]
        .span32();
    let short_token_swap_path: Span32<ContractAddress> = array![
        4.try_into().unwrap(), 5.try_into().unwrap(), 6.try_into().unwrap()
    ]
        .span32();

    let key: felt252 = 123456789;
    let mut withdrawal = Withdrawal {
        key: key,
        account,
        receiver: account,
        callback_contract: 1.try_into().unwrap(),
        ui_fee_receiver: 1.try_into().unwrap(),
        market: 1.try_into().unwrap(),
        long_token_swap_path,
        short_token_swap_path,
        market_token_amount: 1,
        min_long_token_amount: 1,
        min_short_token_amount: 1,
        updated_at_block: 1,
        execution_fee: 1,
        callback_gas_limit: 1,
    };
    data_store.set_withdrawal(key, withdrawal);

    // Given
    data_store.remove_withdrawal(key, account);

    // Then
    let withdrawal_by_key = data_store.get_withdrawal(key);
    assert(withdrawal_by_key.account.is_zero(), 'withdrawal should be removed');
    let account_withdrawal_count = data_store.get_account_withdrawal_count(account);
    assert(account_withdrawal_count == 0, 'Acc withdrawal # should be 0');
    let account_withdrawal_keys = data_store.get_account_withdrawal_keys(account, 0, 10);
    assert(account_withdrawal_keys.len() == 0, 'Acc withdraw # not empty');

    teardown(data_store);
}


/// Utility function to teardown the test environment.
///
/// # Arguments
///
/// * `data_store_address` - The address of the data store contract.
fn teardown(data_store: IDataStoreDispatcher) {
    stop_cheat_caller_address(data_store.contract_address);
}
