use starknet::{ContractAddress, contract_address_const};
use snforge_std::{declare, ContractClassTrait, spy_events, EventSpy, EventSpyTrait, Event, EventSpyAssertionsTrait};

use satoru::test_utils::tests_lib::deploy_event_emitter;

use satoru::event::event_emitter::{EventEmitter, IEventEmitterDispatcher, IEventEmitterDispatcherTrait};

use satoru::event::event_emitter::EventEmitter::{ExecutionFeeRefund, KeeperExecutionFee};

#[test]
fn given_normal_conditions_when_emit_execution_fee_refund_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let contract_address = deploy_event_emitter();
    let event_emitter = IEventEmitterDispatcher { contract_address };
    let mut spy = spy_events();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Create dummy data.
    let receiver = contract_address_const::<'receiver'>();
    let refund_fee_amount: u256 = 1;

    // Emit the event.
    event_emitter.emit_execution_fee_refund(receiver, refund_fee_amount);
    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::ExecutionFeeRefund(
                        ExecutionFeeRefund { receiver: receiver, refund_fee_amount: refund_fee_amount }
                    )
                )
            ]
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}

#[test]
fn given_normal_conditions_when_emit_keeper_execution_fee_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let contract_address = deploy_event_emitter();
    let event_emitter = IEventEmitterDispatcher { contract_address };
    let mut spy = spy_events();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Create dummy data.
    let keeper = contract_address_const::<'keeper'>();
    let execution_fee_amount: u256 = 1;

    // Emit the event.
    event_emitter.emit_keeper_execution_fee(keeper, execution_fee_amount);
    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::KeeperExecutionFee(
                        KeeperExecutionFee { keeper: keeper, execution_fee_amount: execution_fee_amount }
                    )
                )
            ]
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}
