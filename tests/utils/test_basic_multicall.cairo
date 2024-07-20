use satoru::utils::basic_multicall::multicall;
use starknet::{
    ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const,
    contract_address_to_felt252, account::Call, SyscallResultTrait
};
use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait};
use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::{role, role_store::IRoleStoreDispatcher, role_store::IRoleStoreDispatcherTrait};
use satoru::test_utils::tests_lib;
use satoru::market::market_factory::{IMarketFactoryDispatcher, IMarketFactoryDispatcherTrait};


#[test]
fn given_normal_conditions_when_simple_multicall_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (_, data_store, market_factory) = setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    let mut calls = array![];
    let mut calldata_param = array![1, 42];
    let first_call = Call {
        to: data_store.contract_address,
        selector: selector!("set_felt252"), /// generate keccak hash for 'set_felt252' in cairo
        calldata: calldata_param.span()
    };
    calls.append(first_call);

    let result: Array<Span<felt252>> = multicall(calls);

    // check first call result
    assert(data_store.get_felt252(1) == 42, 'Invalid value');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown(data_store, market_factory);
}


#[test]
fn given_normal_conditions_when_multicall_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (role_store, data_store, market_factory) = setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    let mut calls = array![];

    // build first call to data_store_address
    let mut calldata_param = array![1, 42];
    let first_call = Call {
        to: data_store.contract_address,
        selector: selector!("set_felt252"), // generate keccak hash for 'set_felt252'
        calldata: calldata_param.span()
    };
    calls.append(first_call);

    // build second call to role_store
    let account_address: ContractAddress = contract_address_const::<1>();
    let felt_account_address = contract_address_to_felt252(account_address);
    let mut calldata2_param = array![felt_account_address, role::ROLE_ADMIN];
    let second_call = Call {
        to: role_store.contract_address,
        selector: selector!("grant_role"), // generate keccak hash for 'grant_role'
        calldata: calldata2_param.span()
    };
    calls.append(second_call);

    // perform multicall operation
    let result: Array<Span<felt252>> = multicall(calls);

    // check first call result
    assert(data_store.get_felt252(1) == 42, 'Invalid value after first call');

    // check second call result
    assert(role_store.has_role(account_address, role::ROLE_ADMIN), 'Invalid role after second call');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown(data_store, market_factory);
}

#[test]
#[should_panic(expected: ('no data for multicall',))]
fn given_no_data_when_multicall_then_fails() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (_role_store, data_store, market_factory) = setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    let mut calls = array![];
    let mut calldata_param = array![1, 42];
    let first_call = Call {
        to: data_store.contract_address,
        selector: selector!("set_felt25"), /// generate keccak hash for 'set_felt252' in cairo
        calldata: calldata_param.span()
    };

    // should panic due to empty calls. Notice that calls has no append()
    let result: Array<Span<felt252>> = multicall(calls);

    // check first call result
    assert(data_store.get_felt252(1) == 42, 'Invalid value');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown(data_store, market_factory);
}

fn setup() -> (IRoleStoreDispatcher, IDataStoreDispatcher, IMarketFactoryDispatcher) {
    let (
        _caller_address,
        _market_factory__address,
        _role_store_address,
        _data_store_address,
        _market_token_class_hash,
        market_factory,
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
        _liquidation_handler
    ) = tests_lib::setup();
    (role_store, data_store, market_factory)
}
