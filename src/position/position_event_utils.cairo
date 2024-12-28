// *************************************************************************
//                                  IMPORTS
// *************************************************************************
// Core lib imports.

// Local imports.

use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use freyr::order::order::OrderType;
use freyr::position::{position::Position, position_utils::DecreasePositionCollateralValues};
use freyr::price::price::Price;
use freyr::pricing::position_pricing_utils::PositionFees;
use freyr::utils::i256::i256;
use starknet::ContractAddress;


/// Struct to store a position increase parameters.
#[derive(Drop, starknet::Store, Serde)]
struct PositionIncreaseParams {
    /// The main event emitter contract.
    event_emitter: IEventEmitterDispatcher,
    /// The key linked to the position increase order.
    order_key: felt252,
    /// The key linked to the position.
    position_key: felt252,
    /// The position struct.
    position: Position,
    /// The market index token price.
    index_token_price: Price,
    /// The position index token price.
    collateral_token_price: Price,
    /// The execution price.
    execution_price: u256,
    /// The position increase amount in usd.
    size_delta_usd: u256,
    /// The position increase amount in tokens.
    size_delta_in_tokens: u256,
    /// The collateral variation amount in usd.
    collateral_delta_amount: i256,
    /// The position increase price impact in usd.
    price_impact_usd: i256,
    /// The position increase price impact in tokens.
    price_impact_amount: i256,
    /// The type of the order.
    order_type: OrderType,
}
