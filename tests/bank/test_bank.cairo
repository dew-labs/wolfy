//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use starknet::{ContractAddress, contract_address_const};
use integer::u256_from_felt252;
use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait, ContractClass};
// Local imports.
use satoru::bank::bank::{IBankDispatcherTrait, IBankDispatcher};
use satoru::role::role_store::{IRoleStoreDispatcherTrait, IRoleStoreDispatcher};
use satoru::data::data_store::{IDataStoreDispatcherTrait, IDataStoreDispatcher};
use satoru::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use satoru::role::role;
use satoru::test_utils::tests_lib;

// *********************************************************************************************
// *                              SETUP                                                        *
// *********************************************************************************************
fn setup() -> (
    ContractAddress, ContractAddress, IRoleStoreDispatcher, IDataStoreDispatcher, IBankDispatcher, IERC20Dispatcher, ContractClass,
) {
    let (
        caller_address,
        _market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        role_module_class,
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
        _referral_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        _,
        bank,
        _,
        _,
    ) =
        tests_lib::setup();

    let erc20 = tests_lib::deploy_erc20_token(bank.contract_address);
    let receiver_address = contract_address_const::<'dummy_receiver'>();

    return (
        caller_address, receiver_address, role_store, data_store, bank, IERC20Dispatcher { contract_address: erc20 }, role_module_class
    );
}

// *********************************************************************************************
// *                              TEST LOGIC                                                   *
// *********************************************************************************************
#[test]
#[should_panic(expected: ('already_initialized',))]
fn given_already_intialized_when_initialize_then_fails() {
    let (_caller_address, _, role_store, data_store, bank, _, role_module_class) = setup();
    // try initializing after previously initializing in setup
    bank.initialize(data_store.contract_address, role_store.contract_address, role_module_class.class_hash);
    teardown(data_store, bank);
}

#[test]
fn given_normal_conditions_when_transfer_out_then_works() {
    let (_caller_address, receiver_address, _role_store, data_store, bank, erc20, _) = setup();
    // call the transfer_out function
    bank.transfer_out(bank.contract_address, erc20.contract_address, receiver_address, 100_u256);
    // check that the contract balance reduces
    let contract_balance = erc20.balance_of(bank.contract_address);
    assert(contract_balance == u256_from_felt252(900), 'transfer_out failed');
    // check that the balance of the receiver increases
    let receiver_balance = erc20.balance_of(receiver_address);
    assert(receiver_balance == u256_from_felt252(100), 'transfer_out failed');
    // teardown
    teardown(data_store, bank);
}

#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_caller_has_no_controller_role_when_transfer_out_then_fails() {
    let (caller_address, receiver_address, _role_store, data_store, bank, erc20, _) = setup();
    // stop prank as caller_address and start prank as receiver_address who has no controller role
    stop_cheat_caller_address(bank.contract_address);
    start_cheat_caller_address(bank.contract_address, receiver_address);
    // call the transfer_out function
    bank.transfer_out(bank.contract_address, erc20.contract_address, caller_address, 100_u256);
    // teardown
    teardown(data_store, bank);
}

#[test]
#[should_panic(expected: ('self_transfer_not_supported',))]
fn given_receiver_is_contract_when_transfer_out_then_fails() {
    let (_caller_address, _, _role_store, data_store, bank, erc20, _) = setup();
    // call the transfer_out function with receiver as bank contract address
    bank.transfer_out(bank.contract_address, erc20.contract_address, bank.contract_address, 100_u256);
    // teardown
    teardown(data_store, bank);
}

// *********************************************************************************************
// *                              TEARDOWN                                                     *
// *********************************************************************************************
fn teardown(data_store: IDataStoreDispatcher, bank: IBankDispatcher) {
    stop_cheat_caller_address(data_store.contract_address);
    stop_cheat_caller_address(bank.contract_address);
}
