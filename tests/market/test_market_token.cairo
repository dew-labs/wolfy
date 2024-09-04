use result::ResultTrait;
use traits::{TryInto, Into};
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const, ClassHash, ClassHashIntoFelt252};
use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClass, ContractClassTrait, DeclareResultTrait};


use satoru::market::market_token::{IMarketTokenDispatcher, IMarketTokenDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::role::role;
use satoru::market::market_utils;
use satoru::test_utils::tests_lib;

#[test]
fn given_normal_conditions_when_mint_then_expected_results() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (caller_address, _role_store, market_token) = setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************
    // Check that the total supply is 0.
    assert(market_token.total_supply() == 0, 'wrong supply');

    // Mint 100 tokens to the caller.
    market_token.mint(caller_address, 100);

    // Check that the total supply is 100.
    assert(market_token.total_supply() == 100, 'wrong supply');

    // Check that the caller has 100 tokens.
    assert(market_token.balance_of(caller_address) == 100, 'wrong balance');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    teardown(market_token.contract_address);
}

/// Utility function to setup the test environment.
fn setup() -> (
    // This caller address will be used with `start_cheat_caller_address` cheatcode to mock the caller address.,
    ContractAddress, // Interface to interact with the `RoleStore` contract.
    IRoleStoreDispatcher, // Interface to interact with the `MarketToken` contract.
    IMarketTokenDispatcher,
) {
    let (
        caller_address,
        market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        role_module_class,
        bank_class,
        _governable_class,
        _market_factory,
        role_store,
        _data_store,
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
        _,
        _,
        _,
    ) =
        tests_lib::setup();

    // Deploy the contract.
    let market_token_address = deploy_only_market_token(
        market_token_class, role_store.contract_address, 11111.try_into().unwrap(), bank_class.class_hash, role_module_class.class_hash
    );
    // Create a safe dispatcher to interact with the contract.
    let market_token = IMarketTokenDispatcher { contract_address: market_token_address };

    start_cheat_caller_address(market_token_address, caller_address);

    (caller_address, role_store, market_token)
}

/// Utility function to teardown the test environment.
///
/// # Arguments
///
/// * `market_token_address` - The address of the `MarketToken` contract.
fn teardown(market_token_address: ContractAddress) {
    stop_cheat_caller_address(market_token_address);
    tests_lib::teardown();
}

fn deploy_only_market_token(
    contract: ContractClass, role_store_address: ContractAddress, data_store_address: ContractAddress, bank_class_hash: ClassHash, role_module_class_hash: ClassHash
) -> ContractAddress {
    let mut constructor_calldata: Array<felt252> = array![role_store_address.into(), data_store_address.into(), bank_class_hash.into(), role_module_class_hash.into()];

    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    contract_address
}
