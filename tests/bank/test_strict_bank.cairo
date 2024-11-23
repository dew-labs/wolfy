// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.

use debug::PrintTrait;

// Local imports.
use freyr::bank::bank::{IBankDispatcherTrait, IBankDispatcher};
use freyr::bank::strict_bank::{IStrictBankDispatcher, IStrictBankDispatcherTrait};
use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::role::role;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::test_utils::tests_lib;
use freyr::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use integer::u256_from_felt252;
use result::ResultTrait;
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait, DeclareResultTrait,
    ContractClass
};
use starknet::{ContractAddress, get_caller_address, contract_address_const, ClassHash,};
use traits::{TryInto, Into};

/// Setup required contracts.
fn setup_contracts() -> (
    // This caller address will be used with `start_cheat_caller_address` cheatcode to mock the caller address.,
    ContractAddress, // This receiver address will be used with `start_cheat_caller_address` cheatcode to mock the receiver address.,
    ContractAddress, // Interface to interact with the `RoleStore` contract.
    IRoleStoreDispatcher, // Interface to interact with the `DataStore` contract.
    IDataStoreDispatcher, // Interface to interact with the `Bank` contract.
    IBankDispatcher, // Interface to interact with the `StrictBank` contract.
    IStrictBankDispatcher,
    ContractClass,
    ContractClass,
) {
    let (
        caller_address,
        _market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        role_module_class,
        bank_class,
        _governable_class,
        _market_utils_class,
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
        bank,
        strict_bank,
        _,
    ) =
        tests_lib::setup();

    let receiver_address = contract_address_const::<'dummy_receiver'>();

    (caller_address, receiver_address, role_store, data_store, bank, strict_bank, role_module_class, bank_class)
}


// *********************************************************************************************
// *                              TEARDOWN                                                     *
// *********************************************************************************************
fn teardown(data_store: IDataStoreDispatcher, strict_bank: IStrictBankDispatcher) {
    stop_cheat_caller_address(data_store.contract_address);
    stop_cheat_caller_address(strict_bank.contract_address);
}


#[test]
#[should_panic(expected: ('already_initialized',))]
fn given_already_initialized_contract_when_initializing_then_fail() {
    let (
        _caller_address, _receiver_address, role_store, data_store, _bank, strict_bank, role_module_class, bank_class
    ) =
        setup_contracts();
    // try initializing after previously initializing in setup
    strict_bank
        .initialize(
            data_store.contract_address,
            role_store.contract_address,
            bank_class.class_hash,
            role_module_class.class_hash
        );
    teardown(data_store, strict_bank);
}

#[test]
fn given_normal_conditions_when_transfer_out_then_works() {
    let (_caller_address, receiver_address, _role_store, data_store, _bank, strict_bank, _, _) = setup_contracts();

    // deploy erc20 token
    let erc20_contract_address = tests_lib::deploy_erc20_token(strict_bank.contract_address);
    let erc20_dispatcher = IERC20Dispatcher { contract_address: erc20_contract_address };

    // call the transfer_out function
    strict_bank.transfer_out(strict_bank.contract_address, erc20_contract_address, receiver_address, 100_u256);
    // check that the contract balance reduces
    let contract_balance = erc20_dispatcher.balance_of(strict_bank.contract_address);
    assert(contract_balance == u256_from_felt252(900), 'transfer_out failed');
    // check that the balance of the receiver increases
    let receiver_balance = erc20_dispatcher.balance_of(receiver_address);
    assert(receiver_balance == u256_from_felt252(100), 'transfer_out failed');
    // teardown
    teardown(data_store, strict_bank);
}

#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_has_no_controller_role_when_transfer_out_then_fails() {
    let (caller_address, receiver_address, _role_store, data_store, _bank, strict_bank, _, _) = setup_contracts();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // deploy erc20 token
    let erc20_contract_address = tests_lib::deploy_erc20_token(strict_bank.contract_address);

    // stop prank as caller_address and start prank as receiver_address who has no controller role
    stop_cheat_caller_address(strict_bank.contract_address);
    start_cheat_caller_address(strict_bank.contract_address, receiver_address);
    // call the transfer_out function
    strict_bank.transfer_out(strict_bank.contract_address, erc20_contract_address, caller_address, 100);
    // teardown
    teardown(data_store, strict_bank);
}

#[test]
#[should_panic(expected: ('self_transfer_not_supported',))]
fn given_receiver_is_contract_when_transfer_out_then_fails() {
    let (_caller_address, _receiver_address, _role_store, data_store, _bank, strict_bank, _, _) = setup_contracts();

    // deploy erc20 token. Mint to bank since we call transfer out in bank contract which restricts sending to self
    let erc20_contract_address = tests_lib::deploy_erc20_token(strict_bank.contract_address);

    strict_bank
        .transfer_out(strict_bank.contract_address, erc20_contract_address, strict_bank.contract_address, 100_u256);

    //teardown
    teardown(data_store, strict_bank);
}

#[test]
fn given_normal_conditions_when_record_transfer_in_works() {
    let (caller_address, _receiver_address, _role_store, data_store, _bank, strict_bank, _, _) = setup_contracts();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // deploy erc20 token
    let erc20_contract_address = tests_lib::deploy_erc20_token(strict_bank.contract_address);
    let erc20_dispatcher = IERC20Dispatcher { contract_address: erc20_contract_address };

    start_cheat_caller_address(erc20_contract_address, caller_address);

    // send tokens into strict bank
    erc20_dispatcher.transfer(strict_bank.contract_address, u256_from_felt252(50));

    let new_balance: u256 = erc20_dispatcher.balance_of(strict_bank.contract_address).try_into().unwrap();

    assert(strict_bank.record_transfer_in(erc20_contract_address) == new_balance, 'unsuccessful transfer in');

    // teardown
    teardown(data_store, strict_bank);
}

#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_has_no_controller_role_when_record_transfer_in_then_fails() {
    let (_caller_address, receiver_address, _role_store, data_store, _bank, strict_bank, _, _) = setup_contracts();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // deploy erc20 token
    let erc20_contract_address = tests_lib::deploy_erc20_token(strict_bank.contract_address);

    // stop prank as caller_address and start prank as receiver_address who has no controller role
    stop_cheat_caller_address(strict_bank.contract_address);
    start_cheat_caller_address(strict_bank.contract_address, receiver_address);
    // call the transfer_out function with receiver address
    strict_bank.record_transfer_in(erc20_contract_address);
    // teardown
    teardown(data_store, strict_bank);
}

#[test]
fn given_normal_conditions_when_sync_token_balance_passes() {
    let (caller_address, _receiver_address, _role_store, data_store, _bank, strict_bank, _, _) = setup_contracts();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // deploy erc20 token
    let erc20_contract_address = tests_lib::deploy_erc20_token(strict_bank.contract_address);
    let erc20_dispatcher = IERC20Dispatcher { contract_address: erc20_contract_address };

    start_cheat_caller_address(erc20_contract_address, caller_address);

    // send tokens into strict bank
    erc20_dispatcher.transfer(strict_bank.contract_address, u256_from_felt252(50));

    strict_bank.sync_token_balance(erc20_contract_address);

    // teardown
    teardown(data_store, strict_bank);
}

#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_has_no_controller_role_when_sync_token_balance_then_fails() {
    let (caller_address, receiver_address, _role_store, data_store, _bank, strict_bank, _, _) = setup_contracts();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // deploy erc20 token
    let erc20_contract_address = tests_lib::deploy_erc20_token(strict_bank.contract_address);
    let erc20_dispatcher = IERC20Dispatcher { contract_address: erc20_contract_address };

    start_cheat_caller_address(erc20_contract_address, caller_address);

    // send tokens into strict bank
    erc20_dispatcher.transfer(strict_bank.contract_address, u256_from_felt252(50));

    // stop prank as caller_address and start prank as receiver_address who has no controller role
    stop_cheat_caller_address(strict_bank.contract_address);
    start_cheat_caller_address(strict_bank.contract_address, receiver_address);
    // call the sync_token_balance function with receiver address
    strict_bank.sync_token_balance(erc20_contract_address);
    // teardown
    teardown(data_store, strict_bank);
}

