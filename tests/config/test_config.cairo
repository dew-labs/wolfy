// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.

use freyr::config::config::{IConfigDispatcher, IConfigDispatcherTrait};

// Local imports.
use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::data::keys;
use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use freyr::role::role;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::test_utils::tests_lib;
use result::ResultTrait;
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::{ClassHash, ContractAddress, contract_address_const, get_caller_address};
use traits::{Into, TryInto};

#[test]
fn given_normal_conditions_when_set_bool_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (_caller_address, config, _role_store, _data_store, _event_emitter) = setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables to be used in the test.
    let base_key_holding_address = keys::holding_address();
    let mut data = array![];
    data.append('data_1');
    data.append('data_2');
    data.append('data_3');
    let value = true;

    // Actual test case.
    config.set_bool(base_key_holding_address, data, value);

    // Perform assertions.

    // Check that the value was set correctly.
    // FIXME: #18 https://github.com/dew-labs/wolfy/issues/18
    // When `data_store::set_bool` is fixed, check that the value was set correctly.

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    teardown(config);
}

#[test]
fn given_normal_conditions_when_set_address_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (_caller_address, config, _role_store, data_store, _event_emitter) = setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables to be used in the test.
    let base_key_holding_address = keys::holding_address();
    let mut data = array![];
    data.append('data_1');
    data.append('data_2');
    data.append('data_3');
    let value = contract_address_const::<1>();
    let data_store_entry_key = 0xad83c0e73037c4b6af8d6dff599d1103e440a8f6b62ce0208b1999ec8a115e;

    // Actual test case.
    config.set_address(base_key_holding_address, data, value);

    // Perform assertions.

    // Read the value from the data store.
    let actual_value = data_store.get_address(data_store_entry_key);
    // Check that the value was set correctly.
    assert(actual_value == value, 'wrong_value');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    teardown(config);
}

#[test]
fn given_not_allowed_key_when_set_address_then_fails() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (_caller_address, config, _role_store, _data_store, _event_emitter) = setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables to be used in the test.
    let _not_allowed_key = 'not_allowed_key';
    let mut data = array![];
    data.append('data_1');
    data.append('data_2');
    data.append('data_3');
    let _value = contract_address_const::<1>();

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    teardown(config);
}

#[test]
fn given_normal_conditions_when_set_felt252_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (_caller_address, config, _role_store, data_store, _event_emitter) = setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Define variables to be used in the test.
    let base_key_holding_address = keys::holding_address();
    let mut data = array![];
    data.append('data_1');
    data.append('data_2');
    data.append('data_3');
    let value = 'felt252_value';
    let data_store_entry_key = 0xad83c0e73037c4b6af8d6dff599d1103e440a8f6b62ce0208b1999ec8a115e;

    // Actual test case.
    config.set_felt252(base_key_holding_address, data, value);

    // Perform assertions.

    // Read the value from the data store.
    let actual_value = data_store.get_felt252(data_store_entry_key);
    // Check that the value was set correctly.
    assert(actual_value == value, 'wrong_value');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    teardown(config);
}

/// Utility function to teardown the test environment.
fn teardown(config: IConfigDispatcher) {
    tests_lib::teardown();
    stop_cheat_caller_address(config.contract_address);
}

fn setup() -> (
    // This caller address will be used with `start_cheat_caller_address` cheatcode to mock the caller address.,
    ContractAddress, // Interface to interact with the `Config` contract.
    IConfigDispatcher, // Interface to interact with the `RoleStore` contract.
    IRoleStoreDispatcher, // Interface to interact with the `DataStore` contract.
    IDataStoreDispatcher, // Interface to interact with the `EventEmitter` contract.
    IEventEmitterDispatcher,
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
        _market_utils_class,
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
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        _,
        _,
        _,
    ) =
        tests_lib::setup();

    role_store.grant_role(caller_address, role::CONFIG_KEEPER);

    // Deploy the `Config` contract.
    let config_address = deploy_config(
        data_store.contract_address,
        role_store.contract_address,
        event_emitter.contract_address,
        role_module_class.class_hash,
    );

    // Create a safe dispatcher to interact with the contract.
    let config = IConfigDispatcher { contract_address: config_address };

    start_cheat_caller_address(config.contract_address, caller_address);

    (caller_address, config, role_store, data_store, event_emitter)
}

/// Utility function to deploy a market factory contract and return its address.
fn deploy_config(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    role_module_class_hash: ClassHash,
) -> ContractAddress {
    let contract = declare("Config").unwrap().contract_class();
    let caller_address = tests_lib::get_c4ller_address();
    let config_address = contract_address_const::<'config'>();
    start_cheat_caller_address(config_address, caller_address);
    let mut constructor_calldata: Array<felt252> = array![];
    constructor_calldata.append(role_store_address.into());
    constructor_calldata.append(data_store_address.into());
    constructor_calldata.append(event_emitter_address.into());
    constructor_calldata.append(role_module_class_hash.into());
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, config_address).unwrap();
    contract_address
}
