mod adl {
    mod test_adl_utils; // passed
}
mod bank {
    mod test_bank; // failed
    mod test_strict_bank; // failed
}
mod callback {
    mod test_callback_utils; // passed
}
mod config {
    mod test_config; // passed
}
mod data {
    mod test_data_store; // passed
    mod test_deposit_store; // failed
    mod test_keys; // passed
    mod test_market; // passed
    mod test_order; // passed
    mod test_position; // passed
    mod test_withdrawal; // passed
}
mod deposit {
    mod test_deposit_utils; // failed
    // mod test_deposit_vault; // cannot compile
    mod test_execute_deposit_utils; // passed
}
mod event {
    mod test_adl_events_emitted; // passed
    mod test_callback_events_emitted; // passed
    mod test_config_events_emitted; // passed
    mod test_gas_events_emitted; // passed
    mod test_market_events_emitted; // passed
    mod test_oracle_events_emitted; // passed
    mod test_order_events_emitted; // passed
    mod test_position_events_emitted; // passed
    mod test_pricing_events_emitted; // passed
    mod test_referral_events_emitted; // passed
    mod test_swap_events_emitted; // passed
    mod test_timelock_events_emitted; // passed
    mod test_withdrawal_events_emitted; // passed
    mod test_event_utils; // passed
}
mod exchange {
    mod test_liquidation_handler; // failed
    mod test_withdrawal_handler; // failed
    mod test_deposit_handler; // failed
    mod test_exchange_utils; // passed
    mod test_base_order_handler; // failed
}
mod feature {
    mod test_feature_utils; // failed
}
mod fee {
    mod test_fee_handler; // failed
    mod test_fee_utils; // passed
}
mod market {
    mod test_market_factory; // passed
    mod test_market_token; // passed
    mod test_market_utils; // passed
}
mod nonce {
    mod test_nonce_utils; // passed
}
mod oracle {
    mod test_oracle; // failed
}
mod order {
    mod test_base_order_utils; // passed
    mod test_increase_order_utils; // passed
    mod test_order; // passed
    // mod test_order_vault; // not implemented
}
mod position {
    mod test_decrease_position_collateral_utils; // failed
    mod test_decrease_position_utils; // passed
    mod test_decrease_position_swap_utils; // failed
    mod test_position_utils; // failed
}
mod price {
    mod test_price; // passed
}
mod pricing {
    mod test_position_pricing_utils; // passed
    mod test_swap_pricing_utils; // passed
}
mod reader {
    mod test_reader; // failed
}
mod role {
    mod test_role_module; // passed
    mod test_role_store; // passed
}
mod router {
    mod test_router; // failed
}
mod swap {
    mod test_swap_handler; // failed
}
mod utils {
    mod test_account_utils; // passed
    mod test_arrays; // passed
    mod test_basic_multicall; // passed
    mod test_calc; // passed
    mod test_enumerable_set; // passed
    mod test_i256; // passed
    mod test_precision; // passed
    mod test_reentrancy_guard; // passed
    mod test_serializable_dict; // passed
    mod test_starknet_utils; // passed
    mod test_u256_mask; // passed
}
mod withdrawal {
    mod test_withdrawal_vault; // failed
}
mod mock {
    mod test_governable; // failed
    mod test_referral_storage; // passed
}
mod referral {
    mod test_referral_utils; // failed
}

mod integration {
    mod test_create_and_execute_swap; // failed
    // mod test_deposit_withdrawal; // outdated
    mod test_short_integration; // failed
    // mod test_swap_integration; // outdated
    mod test_long_integration; // failed
    mod swap_test; // passed
}
