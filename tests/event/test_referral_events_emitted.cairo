use starknet::{ContractAddress, contract_address_const};
use snforge_std::{
    declare, ContractClassTrait, spy_events, EventSpy, EventSpyTrait, Event, EventSpyAssertionsTrait
};

use satoru::event::event_emitter::{EventEmitter, IEventEmitterDispatcher, IEventEmitterDispatcherTrait};

use satoru::event::event_emitter::EventEmitter::{AffiliateRewardUpdated, AffiliateRewardClaimed};


use satoru::test_utils::tests_lib::deploy_event_emitter;

#[test]
fn given_normal_conditions_when_emit_affiliate_reward_updated_then_works() {
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
    let market = contract_address_const::<'market'>();
    let token = contract_address_const::<'token'>();
    let affiliate = contract_address_const::<'affiliate'>();
    let delta: u256 = 100;
    let next_value: u256 = 200;
    let next_pool_value: u256 = 300;

    // Emit the event.
    event_emitter.emit_affiliate_reward_updated(market, token, affiliate, delta, next_value, next_pool_value);

    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::AffiliateRewardUpdated(
                        AffiliateRewardUpdated {
                            market: market,
                            token: token,
                            affiliate: affiliate,
                            delta: delta,
                            next_value: next_value,
                            next_pool_value: next_pool_value
                        }
                    )
                )
            ]
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}

#[test]
fn given_normal_conditions_when_emit_affiliate_reward_claimed_then_works() {
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
    let market = contract_address_const::<'market'>();
    let token = contract_address_const::<'token'>();
    let affiliate = contract_address_const::<'affiliate'>();
    let receiver = contract_address_const::<'receiver'>();
    let amount: u256 = 100;
    let next_pool_value: u256 = 200;

    // Emit the event.
    event_emitter.emit_affiliate_reward_claimed(market, token, affiliate, receiver, amount, next_pool_value);

    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::AffiliateRewardClaimed(
                        AffiliateRewardClaimed {
                            market: market,
                            token: token,
                            affiliate: affiliate,
                            receiver: receiver,
                            amount: amount,
                            next_pool_value: next_pool_value
                        }
                    )
                )
            ]
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}
