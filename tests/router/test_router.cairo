use freyr::role::role;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::router::router::{IRouterDispatcher, IRouterDispatcherTrait};
use freyr::test_utils::tests_lib;
use freyr::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use result::ResultTrait;
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait, DeclareResultTrait,
    ContractClass
};
use starknet::{ContractAddress, get_caller_address, contract_address_const};
use traits::{TryInto, Into};

#[test]
fn given_normal_conditions_when_transfer_then_expected_results() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let mint_amount = 10000;
    let transfer_amount: u256 = 100;
    let receiver_address = contract_address_const::<'dummy_receiver'>();
    let (sender_address, caller_address, router, test_token) = setup(mint_amount);

    let sender_initial_balance = test_token.balance_of(sender_address);

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Add allowance to the router contract.
    start_cheat_caller_address(test_token.contract_address, sender_address);
    test_token.approve(router.contract_address, mint_amount);
    stop_cheat_caller_address(test_token.contract_address);

    // Transfer tokens from the sender address to the receiver address.
    start_cheat_caller_address(router.contract_address, caller_address);
    router.plugin_transfer(test_token.contract_address, sender_address, receiver_address, transfer_amount);

    // Assert that the tokens have been transfered.
    assert(test_token.balance_of(receiver_address) == transfer_amount.into(), 'unexp. receiver final balance');
    assert(
        sender_initial_balance - transfer_amount.into() == test_token.balance_of(sender_address),
        'unexp. sender final balance'
    );

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    teardown(router.contract_address, test_token.contract_address);
}

#[test]
#[should_panic(expected: ('unauthorized_access',))]
fn given_bad_caller_when_transfer_then_fail() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let mint_amount = 10000;
    let transfer_amount: u256 = 100;
    let receiver_address = contract_address_const::<'dummy_receiver'>();
    let (sender_address, _, router, test_token) = setup(mint_amount);

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Add allowance to the router contract.
    start_cheat_caller_address(test_token.contract_address, sender_address);
    test_token.approve(router.contract_address, mint_amount);
    stop_cheat_caller_address(test_token.contract_address);

    // Prank with a not authorized caller.
    start_cheat_caller_address(router.contract_address, receiver_address);
    // Try to ransfer tokens from the sender address to the receiver address.
    // We expect this call to panic with `unauthorized_access`.
    router.plugin_transfer(test_token.contract_address, sender_address, receiver_address, transfer_amount);

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    teardown(router.contract_address, test_token.contract_address);
}

/// Utility function to setup the test environment.
///
/// # Arguments
///
/// * `mint_amount` - The amount of test token to be minted during deployment.
fn setup(
    mint_amount: u256
) -> (
    ContractAddress, // Minter address.
    ContractAddress, // Caller address.
    IRouterDispatcher, // Interface to interact with the `Router` contract.
    IERC20Dispatcher,
) {
    let caller_address: ContractAddress = tests_lib::get_c4ller_address();
    let minter_address: ContractAddress = 0x102.try_into().unwrap();

    // Deploy the test token.
    let test_token_address = deploy_mock_token(minter_address, mint_amount);
    // Create a test token dispatcher.
    let test_token = IERC20Dispatcher { contract_address: test_token_address };

    // Deploy the role store contract.
    let role_store_address = tests_lib::deploy_role_store();
    // Grant the caller the `ROUTER_PLUGIN` role.
    let role_store = IRoleStoreDispatcher { contract_address: role_store_address };
    start_cheat_caller_address(role_store_address, caller_address);
    role_store.grant_role(caller_address, role::ROUTER_PLUGIN);
    stop_cheat_caller_address(role_store_address);

    let role_module_class = tests_lib::declare_role_module();

    // Deploy the router contract.
    let router_address = tests_lib::deploy_router(role_store_address, role_module_class.class_hash);
    // Create a dispatcher to interact with the contract.
    let router = IRouterDispatcher { contract_address: router_address };

    (minter_address, caller_address, router, test_token)
}

/// Utility function to teardown the test environment.
///
/// # Arguments
///
/// * `test_token_address` - The address of the Test Token contract.
/// * `router_address` - The address of the `Router` contract.
fn teardown(test_token_address: ContractAddress, router_address: ContractAddress) {
    stop_cheat_caller_address(test_token_address);
    stop_cheat_caller_address(router_address);
}

/// Utility function to deploy a test token and return its address.
///
/// # Arguments
///
/// * `minter_address` - The address of the wallet who will get the initial supply.
/// * `initial_amount` - The amount of token minted during the deployment.
fn deploy_mock_token(minter_address: ContractAddress, initial_amount: u256) -> ContractAddress {
    let contract = declare("ERC20").unwrap().contract_class();
    let mut constructor_calldata: Array::<felt252> = array![];
    constructor_calldata.append('TestToken');
    constructor_calldata.append('TST');
    constructor_calldata.append(18);
    constructor_calldata.append(initial_amount.low.into());
    constructor_calldata.append(initial_amount.high.into());
    constructor_calldata.append(minter_address.into());
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    contract_address
}
