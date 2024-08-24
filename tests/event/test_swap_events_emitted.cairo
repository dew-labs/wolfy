use starknet::{ContractAddress, contract_address_const};
use snforge_std::{declare, ContractClassTrait, spy_events, EventSpy, EventSpyTrait, Event, EventSpyAssertionsTrait};
use satoru::test_utils::tests_lib::deploy_event_emitter;

use satoru::pricing::position_pricing_utils::{
    PositionFees, PositionUiFees, PositionBorrowingFees, PositionReferralFees, PositionFundingFees
};

use satoru::event::event_emitter::{EventEmitter, IEventEmitterDispatcher, IEventEmitterDispatcherTrait};

use satoru::event::event_emitter::EventEmitter::{SwapReverted};


#[test]
fn given_normal_conditions_when_emit_swap_reverted_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let contract_address = deploy_event_emitter();
    let event_emitter = IEventEmitterDispatcher { contract_address };
    let mut spy = spy_events();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Create a dummy data.
    let reason = 'reverted';
    let reason_bytes = array!['0x01'];

    // Emit the event.
    event_emitter.emit_swap_reverted(reason, reason_bytes.span());

    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::SwapReverted(
                        SwapReverted { reason: reason, reason_bytes: reason_bytes.span() }
                    )
                )
            ]
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}
