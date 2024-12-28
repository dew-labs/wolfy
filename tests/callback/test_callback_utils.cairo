use freyr::callback::callback_utils::{
    after_deposit_execution, get_saved_callback_contract, set_saved_callback_contract, validate_callback_gas_limit,
};
use freyr::callback::mocks::{ICallbackMockDispatcherTrait, deploy_callback_mock};

use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::data::keys;
use freyr::deposit::deposit::Deposit;
use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use freyr::event::event_utils::{LogData, LogDataTrait};
use freyr::test_utils::tests_lib;
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::ContractAddress;

#[test]
fn given_normal_conditions_when_validate_callback_gas_limit_then_works() {
    let (data_store, _) = setup();
    data_store.set_u256(keys::max_callback_gas_limit(), 100);

    validate_callback_gas_limit(data_store, 100);

    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('max_callback_gas_limit_exceeded', 101, 100))]
fn given_callback_gas_limit_exceeded_when_validate_callback_gas_limit_then_fails() {
    let (data_store, _) = setup();
    data_store.set_u256(keys::max_callback_gas_limit(), 100);

    validate_callback_gas_limit(data_store, 101);

    tests_lib::teardown();
}

#[test]
fn given_normal_conditions_when_saved_callback_then_works() {
    let (data_store, _) = setup();
    let account: ContractAddress = 42.try_into().unwrap();
    let market: ContractAddress = 69.try_into().unwrap();
    let callback: ContractAddress = 123.try_into().unwrap();

    let address = get_saved_callback_contract(data_store, account, market);
    assert(address.into() == 0, 'should be zero');

    set_saved_callback_contract(data_store, account, market, callback);

    let result = get_saved_callback_contract(data_store, account, market);
    assert(result == callback, 'should be ok');

    tests_lib::teardown();
}
// TODO bad syscall_ptr
#[test]
fn given_normal_conditions_when_callback_contract_functions_then_works() {
    let (_data_store, _event_emitter) = setup();

    let mut deposit: Deposit = Default::default();
    let mut log_data: LogData = Default::default();

    let callback_mock = deploy_callback_mock();
    deposit.callback_contract = callback_mock.contract_address;

    assert(callback_mock.get_counter() == 1, 'should be 1');
    after_deposit_execution(42, deposit, log_data);
    assert(callback_mock.get_counter() == 2, 'should be 2');
}

fn setup() -> (IDataStoreDispatcher, IEventEmitterDispatcher) {
    let (
        _caller_address,
        _market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        _role_module_class,
        _bank_class,
        _governable_class,
        _market_utils_class,
        _market_factory,
        _role_store,
        data_store,
        event_emitter,
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
    ) =
        tests_lib::setup();

    (data_store, event_emitter)
}
