use freyr::event::event_emitter::EventEmitter::{SwapInfo, SwapFeesCollected};

use freyr::event::event_emitter::{EventEmitter, IEventEmitterDispatcher, IEventEmitterDispatcherTrait};


use freyr::pricing::swap_pricing_utils::SwapFees;
use freyr::test_utils::tests_lib::deploy_event_emitter;
use freyr::utils::i256::{i256, i256_new};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, spy_events, EventSpy, EventSpyTrait, Event, EventSpyAssertionsTrait
};
use starknet::{ContractAddress, contract_address_const};

#[test]
fn given_normal_conditions_when_emit_swap_info_then_works() {
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
    let order_key = 'swap';
    let market = contract_address_const::<'market'>();
    let receiver = contract_address_const::<'receiver'>();
    let token_in = contract_address_const::<'token_in'>();
    let token_out = contract_address_const::<'token_out'>();
    let token_in_price: u256 = 1;
    let token_out_price: u256 = 2;
    let amount_in: u256 = 3;
    let amount_in_after_fees: u256 = 4;
    let amount_out: u256 = 5;
    let price_impact_usd: i256 = i256_new(6, false);
    let price_impact_amount: i256 = i256_new(7, false);

    // Emit the event.
    event_emitter
        .emit_swap_info(
            order_key,
            market,
            receiver,
            token_in,
            token_out,
            token_in_price,
            token_out_price,
            amount_in,
            amount_in_after_fees,
            amount_out,
            price_impact_usd,
            price_impact_amount
        );

    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::SwapInfo(
                        SwapInfo {
                            order_key: order_key,
                            market: market,
                            receiver: receiver,
                            token_in: token_in,
                            token_out: token_out,
                            token_in_price: token_in_price,
                            token_out_price: token_out_price,
                            amount_in: amount_in,
                            amount_in_after_fees: amount_in_after_fees,
                            amount_out: amount_out,
                            price_impact_usd: price_impact_usd,
                            price_impact_amount: price_impact_amount
                        }
                    )
                )
            ]
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}

#[test]
fn given_normal_conditions_when_emit_swap_fees_collected_then_works() {
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
    let token_price: u256 = 1;
    let action = 'action';
    let fees: SwapFees = SwapFees {
        fee_receiver_amount: 1,
        fee_amount_for_pool: 2,
        amount_after_fees: 3,
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
        ui_fee_receiver_factor: 4,
        ui_fee_amount: 5,
    };

    // Emit the event.
    event_emitter.emit_swap_fees_collected(market, token, token_price, action, fees);

    // Assert the event was emitted.
    spy
        .assert_emitted(
            @array![
                (
                    contract_address,
                    EventEmitter::Event::SwapFeesCollected(
                        SwapFeesCollected {
                            market: market, token: token, token_price: token_price, action: action, fees: fees,
                        }
                    )
                )
            ]
        );
    // Assert there are no more events.
    assert(spy.get_events().events.len() == 1, 'There should be no events');
}
