// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use result::ResultTrait;

// Local imports.
use freyr::order::order::{Order, OrderType, OrderTrait, DecreasePositionSwapType};
use freyr::test_utils::tests_lib;
use freyr::utils::span32::{Span32, Array32Trait};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, start_cheat_block_number_global, stop_cheat_block_number_global
};
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const, ClassHash,};
use traits::{TryInto, Into};

#[test]
fn given_normal_conditions_when_touch_then_expected_results() {
    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Create a dummy order.
    let mut order = create_dummy_order();

    // Set current block to 42000.
    start_cheat_block_number_global(42000);

    order.touch();

    assert(order.updated_at_block == 42000, 'bad value');

    stop_cheat_block_number_global()
}

fn create_dummy_order() -> Order {
    let swap_path: Span32<ContractAddress> = array![
        contract_address_const::<'swap_path_0'>(), contract_address_const::<'swap_path_1'>()
    ]
        .span32();
    Order {
        key: 111,
        order_type: OrderType::StopLossDecrease,
        decrease_position_swap_type: DecreasePositionSwapType::SwapPnlTokenToCollateralToken(()),
        account: contract_address_const::<'account'>(),
        receiver: contract_address_const::<'receiver'>(),
        callback_contract: contract_address_const::<'callback_contract'>(),
        ui_fee_receiver: contract_address_const::<'ui_fee_receiver'>(),
        market: contract_address_const::<'market'>(),
        initial_collateral_token: contract_address_const::<'initial_collateral_token'>(),
        swap_path,
        size_delta_usd: 1000,
        initial_collateral_delta_amount: 500,
        trigger_price: 2000,
        acceptable_price: 2500,
        execution_fee: 100,
        callback_gas_limit: 300000,
        min_output_amount: 100,
        updated_at_block: 0,
        is_long: true,
        is_frozen: false,
    }
}
