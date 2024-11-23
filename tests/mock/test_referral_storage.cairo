//! Test file for `src/mock/referral_storage.cairo`.

// *********************************************************************************************
// *                                       IMPORTS                                             *
// *********************************************************************************************
// Core lib imports.

// Local imports.
use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::deposit::deposit::Deposit;
use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use freyr::mock::governable::{IGovernableDispatcher, IGovernableDispatcherTrait};
use freyr::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
use freyr::referral::referral_tier::ReferralTier;
use freyr::referral::referral_utils;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::test_utils::tests_lib;
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClass, ContractClassTrait,
    DeclareResultTrait
};
use starknet::{ContractAddress, contract_address_const};

// *********************************************************************************************
// *                                      TEST LOGIC                                           *
// *********************************************************************************************
#[test]
fn given_normal_conditions_when_setting_handler_from_storage_than_work() {
    let (caller_address, _, _, referral_storage, _) = setup();

    referral_storage.set_handler(caller_address, true);
    referral_storage.only_handler();

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('Unauthorized gov caller',))]
fn given_caller_has_no_gov_role_then_fails() {
    let (caller_address, _, _, referral_storage, _) = setup();
    stop_cheat_caller_address(referral_storage.contract_address);

    let dummy_address: ContractAddress = contract_address_const::<'dummy'>();
    start_cheat_caller_address(referral_storage.contract_address, dummy_address);
    referral_storage.set_handler(caller_address, true);
    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('forbidden',))]
fn given_handler_not_set_than_fails() {
    let (_, _, _, referral_storage, _) = setup();

    referral_storage.only_handler();

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_fetching_code_owner_from_storage_before_setting_then_works() {
    let (_, _, _, referral_storage, _) = setup();

    let code: felt252 = 'EBDW';

    let out: ContractAddress = referral_storage.code_owners(code);
    assert(out == contract_address_const::<0>(), 'address should not be set');

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_setting_and_fetching_tier_from_storage_then_works() {
    let (_, _, _, referral_storage, _) = setup();

    let tier_id: u256 = 3;
    let total_rebate: u256 = 10;
    let discount_share: u256 = 10;
    referral_storage.set_tier(tier_id, total_rebate, discount_share);

    let mut referral_tier: ReferralTier = referral_storage.tiers(tier_id);
    assert(referral_tier.total_rebate == total_rebate, 'total rebate not set');
    assert(referral_tier.discount_share == discount_share, 'discount share not set');

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('invalid total_rebate',))]
fn given_total_rebate_too_high_when_setting_tier_from_storage_then_fails() {
    let (_, _, _, referral_storage, _) = setup();

    let tier_id: u256 = 3;
    let total_rebate: u256 = 10001;
    let discount_share: u256 = 10;
    referral_storage.set_tier(tier_id, total_rebate, discount_share);

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('invalid discount_share',))]
fn given_discount_share_too_high_when_setting_tier_from_storage_then_fails() {
    let (_, _, _, referral_storage, _) = setup();

    let tier_id: u256 = 3;
    let total_rebate: u256 = 10;
    let discount_share: u256 = 10001;
    referral_storage.set_tier(tier_id, total_rebate, discount_share);

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_setting_and_fetching_referrer_tiers_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let tier_id: u256 = 3;
    referral_storage.set_referrer_tier(caller_address, tier_id);

    let out: u256 = referral_storage.referrer_tiers(caller_address);
    assert(out == tier_id, 'out tier_id is wrong');

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_fetching_referrer_tiers_from_storage_before_setting_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let _tier_id: u256 = 3;

    let out: u256 = referral_storage.referrer_tiers(caller_address);
    assert(out == 0, 'out tier_id is wrong');

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_setting_and_fetching_referrer_discount_share_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let discount_share: u256 = 1000;
    referral_storage.set_referrer_discount_share(discount_share);

    let out: u256 = referral_storage.referrer_discount_shares(caller_address);
    assert(out == discount_share, 'out discount_share is wrong');

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('invalid discount_share',))]
fn given_discount_share_too_high_when_setting_referrer_discount_share_from_storage_then_fails() {
    let (_, _, _, referral_storage, _) = setup();

    let discount_share: u256 = 10001;
    referral_storage.set_referrer_discount_share(discount_share);

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_setting_and_fetching_referrer_referral_code_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    referral_storage.set_handler(caller_address, true);

    let code: felt252 = 'EBDW';
    referral_storage.set_trader_referral_code(caller_address, code);

    let out: felt252 = referral_storage.trader_referral_codes(caller_address);
    assert(out == code, 'out code is wrong');

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('forbidden',))]
fn given_not_handler_when_setting_referrer_referral_code_from_storage_then_fails() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let code: felt252 = 'EBDW';
    referral_storage.set_trader_referral_code(caller_address, code);

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_setting_and_fetching_referrer_referral_code_by_user_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let code: felt252 = 'EBDW';
    referral_storage.set_trader_referral_code_by_user(code);

    let out: felt252 = referral_storage.trader_referral_codes(caller_address);
    assert(out == code, 'out code is wrong');

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_registering_code_and_fetching_address_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let code: felt252 = 'EBDW';
    referral_storage.register_code(code);

    let owner: ContractAddress = referral_storage.code_owners(code);
    assert(owner == caller_address, 'out caller_address is wrong');

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('invalid code',))]
fn given_invalid_code_when_registering_code_from_storage_then_fails() {
    let (_caller_address, _, _, referral_storage, _) = setup();

    let code: felt252 = 0;
    referral_storage.register_code(code);

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('code already exists',))]
fn given_code_already_registered_when_registering_code_from_storage_then_fails() {
    let (_caller_address, _, _, referral_storage, _) = setup();

    let code: felt252 = 'EBDW';
    referral_storage.register_code(code);
    referral_storage.register_code(code);

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_gov_setting_and_fetching_code_owner_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let code: felt252 = 'EBDW';
    referral_storage.gov_set_code_owner(code, caller_address);

    let out: ContractAddress = referral_storage.code_owners(code);
    assert(out == caller_address, 'address should be set');

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('invalid code',))]
fn given_invalid_code_when_gov_setting_code_owner_from_storage_then_fails() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let code: felt252 = 0;
    referral_storage.gov_set_code_owner(code, caller_address);

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_setting_and_fetching_new_code_owner_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let new_owner: ContractAddress = contract_address_const::<'new owner'>();
    let code: felt252 = 'EBDW';
    referral_storage.gov_set_code_owner(code, caller_address);
    referral_storage.set_code_owner(code, new_owner);

    let out: ContractAddress = referral_storage.code_owners(code);
    assert(out == new_owner, 'out code owner address is wrong');

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('forbidden',))]
fn given_not_allowed_when_setting_new_code_owner_from_storage_then_fails() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let new_owner: ContractAddress = contract_address_const::<'new owner'>();
    let code: felt252 = 'EBDW';
    referral_storage.set_code_owner(code, new_owner);

    let out: ContractAddress = referral_storage.code_owners(code);
    assert(out == caller_address, 'out code owner address is wrong');

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('invalid code',))]
fn given_invalid_code_when_setting_new_code_owner_from_storage_then_fails() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let new_owner: ContractAddress = contract_address_const::<'new owner'>();
    let code: felt252 = 0;
    referral_storage.gov_set_code_owner(code, caller_address);
    referral_storage.set_code_owner(code, new_owner);

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_fetching_trader_referral_info_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let code: felt252 = 'EBDW';
    referral_storage.register_code(code);
    referral_storage.set_trader_referral_code_by_user(code);

    let (out_code, out_address) = referral_storage.get_trader_referral_info(caller_address);
    assert(out_code == code, 'out code is wrong');
    assert(out_address == caller_address, 'out code owner address is wrong');

    tests_lib::teardown();
}

#[test]
fn given_code_owner_not_set_when_fetching_trader_referral_info_from_storage_then_works() {
    let (caller_address, _, _, referral_storage, _) = setup();

    let (out_code, out_referrer) = referral_storage.get_trader_referral_info(caller_address);
    assert(out_referrer == contract_address_const::<0>(), 'code owner should not be set');
    assert(out_code == 0, 'code should not be set');

    tests_lib::teardown();
}

// *********************************************************************************************
// *                                      SETUP                                                *
// *********************************************************************************************
/// Utility function to setup the test environment
fn setup() -> (
    ContractAddress, IRoleStoreDispatcher, IEventEmitterDispatcher, IReferralStorageDispatcher, IGovernableDispatcher
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
        governable_class,
        _market_utils_class,
        _market_factory,
        role_store,
        _data_store,
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
    ) =
        tests_lib::setup();

    let governable_address = deploy_governable(governable_class, event_emitter.contract_address);
    let governable = IGovernableDispatcher { contract_address: governable_address };

    return (caller_address, role_store, event_emitter, referral_storage, governable);
}

fn deploy_governable(contract: ContractClass, event_emitter_address: ContractAddress) -> ContractAddress {
    let caller_address: ContractAddress = tests_lib::get_c4ller_address();
    let deployed_contract_address = contract_address_const::<'governable'>();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata: Array<felt252> = array![];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    IGovernableDispatcher { contract_address }.initialize(event_emitter_address);
    contract_address
}
