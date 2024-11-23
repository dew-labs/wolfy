use freyr::event::event_emitter::{EventEmitter, IEventEmitterDispatcher, IEventEmitterDispatcherTrait};

use freyr::test_utils::tests_lib::deploy_event_emitter;
use option::OptionTrait;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, spy_events, EventSpy, EventSpyTrait, Event, EventSpyAssertionsTrait
};
use starknet::{ContractAddress, contract_address_const};

#[test]
fn given_normal_conditions_when_emit_adl_state_updated_then_works() {
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
    let market: ContractAddress = contract_address_const::<'market'>();
    let is_long: bool = true;
    let pnl_to_pool_factor: felt252 = 1;
    let max_pnl_factor: u256 = 10;
    let should_enable_adl: bool = false;

    // Emit the event.
    event_emitter.emit_adl_state_updated(market, is_long, pnl_to_pool_factor, max_pnl_factor, should_enable_adl);
    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::AdlStateUpdated(
                        EventEmitter::AdlStateUpdated {
                            market: market.into(),
                            is_long: is_long.into(),
                            pnl_to_pool_factor: pnl_to_pool_factor,
                            max_pnl_factor: max_pnl_factor.into(),
                            should_enable_adl: should_enable_adl.into()
                        }
                    )
                )
            ]
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}
