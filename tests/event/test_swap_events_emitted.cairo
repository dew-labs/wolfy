use freyr::event::event_emitter::EventEmitter::{SwapReverted};

use freyr::event::event_emitter::{EventEmitter, IEventEmitterDispatcher, IEventEmitterDispatcherTrait};

use freyr::pricing::position_pricing_utils::{
    PositionBorrowingFees, PositionFees, PositionFundingFees, PositionReferralFees, PositionUiFees,
};
use freyr::test_utils::tests_lib::deploy_event_emitter;
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, Event, EventSpy, EventSpyAssertionsTrait, EventSpyTrait, declare,
    spy_events,
};
use starknet::{ContractAddress, contract_address_const};


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
    let reason_key = '';

    // Emit the event.
    event_emitter.emit_swap_reverted(reason, reason_key);

    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::SwapReverted(SwapReverted { reason: reason, reason_key: reason_key }),
                ),
            ],
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}
