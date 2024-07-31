use starknet::{ContractAddress, contract_address_const};

use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::mock::governable::{IGovernableDispatcher, IGovernableDispatcherTrait};

use satoru::role::role;
use satoru::deposit::deposit::Deposit;
use satoru::test_utils::tests_lib;
use satoru::utils::span32::{Span32, Array32Trait};
use satoru::referral::referral_utils;

use snforge_std::{declare, start_cheat_caller_address, ContractClassTrait};

fn deploy_governable(event_emitter_address: ContractAddress) -> ContractAddress {
    let contract = declare("Governable").unwrap();
    let caller_address: ContractAddress = tests_lib::get_c4ller_address();
    let deployed_contract_address = contract_address_const::<'governable'>();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![event_emitter_address.into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn setup() -> (
    IEventEmitterDispatcher,
    IGovernableDispatcher,
) {
    let (
        _caller_address,
        _market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        _market_factory,
        _role_store,
        _data_store,
        event_emitter,
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
        _,
        _,
        _,
    ) = tests_lib::setup();

    let governable_address = deploy_governable(event_emitter.contract_address);
    let governable = IGovernableDispatcher { contract_address: governable_address };

    (event_emitter, governable)
}

fn setup_with_other_address() -> (
    IEventEmitterDispatcher,
    IGovernableDispatcher,
) {
    let (
        _caller_address,
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
        referral_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        _,
        _,
        _,
        _,
    ) = tests_lib::setup();

    let caller_address: ContractAddress = 0x102.try_into().unwrap();

    let governable_address = deploy_governable(event_emitter.contract_address);
    let governable = IGovernableDispatcher { contract_address: governable_address };

    start_cheat_caller_address(role_store.contract_address, caller_address);
    start_cheat_caller_address(event_emitter.contract_address, caller_address);
    start_cheat_caller_address(data_store.contract_address, caller_address);
    start_cheat_caller_address(referral_storage.contract_address, caller_address);
    start_cheat_caller_address(governable_address, caller_address);

    (event_emitter, governable)
}

//TODO add more tests

// This test checks the 'only_gov' function under normal conditions.
// It sets up the environment with the correct initial governance, then calls `only_gov`.
// The test expects the call to succeed without any errors.
#[test]
fn given_normal_conditions_when_only_gov_then_works() {
    let (_event_emitter, governable) = setup();
    governable.only_gov();
    tests_lib::teardown();
}

// This test checks the `only_gov` function when the governance condition is not met.
// It sets up the environment with a different governance, then calls `only_gov`.
// The test expects the call to panic with the error 'Unauthorized gov caller'.
#[test]
#[should_panic(expected: ('Unauthorized gov caller',))]
fn given_forbidden_when_only_gov_then_fails() {
    let (_event_emitter, governable) = setup_with_other_address();
    governable.only_gov();
    tests_lib::teardown();
}

// This test checks the `transfer_ownership` function under normal conditions.
// It sets up the environment with the correct initial governance, then calls `transfer_ownership`
// with a new governance address.
// The test expects the call to succeed and the ownership to be transferred without any errors.
#[test]
fn given_normal_conditions_when_transfer_ownership_then_works() {
    let (_event_emitter, governable) = setup();
    let new_caller_address: ContractAddress = 0x102.try_into().unwrap();
    governable.transfer_ownership(new_caller_address);
    tests_lib::teardown();
}

/// This test case verifies the `transfer_ownership` function behavior when called by an unauthorized address.
/// The expected outcome is a panic with the error message "Unauthorized gov caller" which corresponds
/// to the `UNAUTHORIZED_GOV` error in the `MockError` module.
#[test]
#[should_panic(expected: ('Unauthorized gov caller',))]
fn given_unauthorized_caller_when_transfer_ownership_then_fails() {
    // Setup the environment with a different caller address.
    let (_event_emitter, governable) = setup_with_other_address();

    // Try to transfer ownership to a new address.
    let new_uncaller_address: ContractAddress = 0x102.try_into().unwrap();
    governable.transfer_ownership(new_uncaller_address);
    tests_lib::teardown();
}

/// This test checks the `accept_ownership` function under normal conditions.
/// It sets up the environment with the correct initial governance, then calls `transfer_ownership`
/// to a new governance address, followed by `accept_ownership` from the new governance address.
/// The test expects the call to succeed and the ownership to be accepted without any errors.
#[test]
fn given_normal_conditions_when_accept_ownership_then_works() {
    let (_event_emitter, governable) = setup();
    let new_caller_address: ContractAddress = 0x102.try_into().unwrap();

    // Transfer the ownership to the new address.
    governable.transfer_ownership(new_caller_address);

    // Update the prank context to the new governance address, to simulate the new governor accepting the ownership.
    start_cheat_caller_address(governable.contract_address, new_caller_address);

    // Now call accept_ownership from the new governance address.
    governable.accept_ownership();
    tests_lib::teardown();
}

/// This test checks the `accept_ownership` function under abnormal conditions.
/// It sets up the environment with the correct initial governance, then calls `transfer_ownership`
/// to a new governance address. However, `accept_ownership` is then called from an unauthorized address.
/// The test expects the call to panic with the error 'Unauthorized pending_gov caller'.
#[test]
#[should_panic(expected: ('Unauthorized pending_gov caller',))]
fn given_abnormal_conditions_when_accept_ownership_then_fails() {
    let (_event_emitter, governable) = setup();
    let new_caller_address: ContractAddress = 0x102.try_into().unwrap();
    let unauthorized_address: ContractAddress = 0x103.try_into().unwrap();

    // Transfer the ownership to the new address.
    governable.transfer_ownership(new_caller_address);

    // Update the prank context to an unauthorized address, to simulate an unauthorized attempt to accept the ownership.
    start_cheat_caller_address(governable.contract_address, unauthorized_address);

    // Now call accept_ownership from the unauthorized address.
    governable.accept_ownership();
    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('already_initialized',))]
fn given_already_initialized_when_initialize_then_fails() {
    // Setup the environment.
    let (event_emitter, governable) = setup();

    // Assume that the contract has been initialized during setup.
    // Try to initialize it again with the same event emitter address.
    let event_emitter_address = event_emitter.contract_address;

    // This call should panic with the error 'already_initialized'.
    governable.initialize(event_emitter_address);
    tests_lib::teardown();
}
