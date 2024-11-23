use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};

use freyr::data::keys;
use freyr::exchange::exchange_utils::validate_request_cancellation;
use freyr::test_utils::tests_lib;
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_number, ContractClassTrait
};
use starknet::info::get_block_number;
use starknet::{
    ContractAddress, get_caller_address, get_contract_address, Felt252TryIntoContractAddress, contract_address_const
};

#[test]
fn given_exchange_utils_when_validate_request_cancellation_then_success() {
    // Setup
    let data_store = setup();
    let _contract_address = contract_address_const::<0>();

    // Test
    let expiration_age = 5;
    data_store.set_u256(keys::request_expiration_block_age(), expiration_age);

    let block_number = get_block_number();

    let created_at_block = block_number - 5;
    validate_request_cancellation(data_store, created_at_block, 'SOME_REQUEST_TYPE');

    let created_at_block = block_number - 6;
    validate_request_cancellation(data_store, created_at_block, 'SOME_REQUEST_TYPE');

    // Teardown
    tests_lib::teardown();
}

#[test]
#[should_panic(expected: ('request_not_yet_cancellable', 'SOME_REQUEST_TYPE'))]
fn given_exchange_utils_when_validate_request_cancellation_then_fails() {
    // Setup
    let data_store = setup();
    let _contract_address = contract_address_const::<0>();

    // Test
    let expiration_age = 5;
    data_store.set_u256(keys::request_expiration_block_age(), expiration_age);

    let block_number = get_block_number();
    let created_at_block = block_number - 4;

    validate_request_cancellation(data_store, created_at_block, 'SOME_REQUEST_TYPE');
}

fn setup() -> IDataStoreDispatcher {
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
        _,
        _,
        _,
    ) =
        tests_lib::setup();

    data_store
}
