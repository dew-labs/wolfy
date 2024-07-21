use result::ResultTrait;
use traits::{TryInto, Into};
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const};
use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClass, ContractClassTrait};


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
        _market_factory_address,
        _role_store_address,
        _data_store_address,
        market_token_class_hash,
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
    ) = tests_lib::setup();

    // Deploy the contract.
    let market_token_address = deploy_only_market_token(market_token_class_hash, role_store.contract_address, 11111.try_into().unwrap());
    // Create a safe dispatcher to interact with the contract.
    let market_token = IMarketTokenDispatcher { contract_address: market_token_address };

    start_cheat_caller_address(role_store.contract_address, caller_address);

    // Grant the caller the CONTROLLER role.
    // We use the same account to deploy data_store and role_store, so we can grant the role
    // because the caller is the owner of role_store contract.
    role_store.grant_role(caller_address, role::CONTROLLER);

    // Prank the caller address for calls to data_store contract.
    // We need this so that the caller has the CONTROLLER role.
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
}

fn deploy_only_market_token(contract: ContractClass, role_store_address: ContractAddress, data_store_address: ContractAddress) -> ContractAddress {
    let mut constructor_calldata = array![role_store_address.into(), data_store_address.into()];

    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    contract_address
}
