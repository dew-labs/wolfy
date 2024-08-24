use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const};
use snforge_std::{declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait};

use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::fee::fee_handler::{IFeeHandlerDispatcher, IFeeHandlerDispatcherTrait};
use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::role::role;
use satoru::test_utils::tests_lib;
use satoru::data::keys;

use debug::PrintTrait;

#[test]
fn given_normal_conditions_when_fee_handler_then_works() {
    let (_, _, _, fee_handler) = setup();

    // TODO: deploy real market token instead of using dummy one
    let markets: Array<ContractAddress> = array![
        0x777.try_into().unwrap(), 0x888.try_into().unwrap(), 0x999.try_into().unwrap()
    ];
    let tokens: Array<ContractAddress> = array![
        0x123.try_into().unwrap(), 0x234.try_into().unwrap(), 0x345.try_into().unwrap()
    ];

    fee_handler.claim_fees(markets, tokens);
}

#[test]
#[should_panic(expected: ('invalid_claim_fees_input',))]
fn given_wrong_inputs_when_fee_handler_then_fails() {
    let (_, _, _, fee_handler) = setup();

    // TODO: deploy real market token instead of using dummy one
    let markets: Array<ContractAddress> = array![
        0x777.try_into().unwrap(), 0x888.try_into().unwrap(), 0x999.try_into().unwrap()
    ];
    let tokens: Array<ContractAddress> = array![0x123.try_into().unwrap(), 0x234.try_into().unwrap()];

    fee_handler.claim_fees(markets, tokens);
}

fn deploy_fee_handler(
    role_store_address: ContractAddress, data_store_address: ContractAddress, event_emitter_address: ContractAddress
) -> ContractAddress {
    let contract = declare("FeeHandler").unwrap();
    let caller_address: ContractAddress = tests_lib::get_c4ller_address();
    let deployed_contract_address = contract_address_const::<'fee_handler'>();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![
        data_store_address.into(), role_store_address.into(), event_emitter_address.into()
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn setup() -> (ContractAddress, IDataStoreDispatcher, IEventEmitterDispatcher, IFeeHandlerDispatcher) {
    let (
        caller_address,
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

    let fee_handler_address = deploy_fee_handler(
        role_store.contract_address, data_store.contract_address, event_emitter.contract_address
    );
    let fee_handler = IFeeHandlerDispatcher { contract_address: fee_handler_address };

    let account = tests_lib::deploy_mock_account();
    data_store.set_address(keys::fee_receiver(), account);

    (caller_address, data_store, event_emitter, fee_handler)
}
