mod adl {
    mod test_adl_utils; // success
}
mod bank {
    mod test_bank; // success
    mod test_strict_bank; // failed
}
mod callback {
    mod test_callback_utils; // success
}
mod config {
    mod test_config; // success
}
mod data {
    mod test_data_store; // success
    mod test_deposit_store; // success
    mod test_keys; // success
    mod test_market; // success
    mod test_order; // success
    mod test_position; // success
    mod test_withdrawal; // success
}
mod deposit {
    mod test_deposit_utils; // failed
    mod test_deposit_vault; // failed
    // mod test_execute_deposit_utils; // not implemented
}
mod event {
    mod test_adl_events_emitted; // success
    mod test_callback_events_emitted; // success
    mod test_config_events_emitted; // success
    mod test_event_utils; // success
    mod test_gas_events_emitted; // success
    mod test_market_events_emitted; // success
    mod test_oracle_events_emitted; // success
    mod test_order_events_emitted; // success
    mod test_position_events_emitted; // success
    mod test_pricing_events_emitted; // success
    mod test_referral_events_emitted; // success
    mod test_swap_events_emitted; // success
    mod test_timelock_events_emitted; // success
    mod test_withdrawal_events_emitted; // success
}
mod exchange {
    mod test_base_order_handler; // success
    mod test_deposit_handler; // failed
    mod test_exchange_utils; // success
    mod test_liquidation_handler; // failed
    mod test_withdrawal_handler; // failed
}
mod feature {
    mod test_feature_utils; // success
}
mod fee {
    mod test_fee_handler; // failed
    mod test_fee_utils; // success
}
mod market {
    mod test_market_factory; // success
    mod test_market_token; // success
    mod test_market_utils; // success
}
mod nonce {
    mod test_nonce_utils; // success
}
mod oracle {
    mod test_oracle; // success
}
mod order {
    mod test_base_order_utils; // success
    mod test_increase_order_utils; // success
    mod test_order; // success
    // mod test_order_vault; // not implemented
}
mod position {
    mod test_decrease_position_collateral_utils; // failed
    mod test_decrease_position_swap_utils; // failed
    mod test_decrease_position_utils; // failed
    mod test_position_utils; // failed
}
mod price {
    mod test_price; // success
}
mod pricing {
    mod test_position_pricing_utils; // success
    mod test_swap_pricing_utils; // success
}
mod reader {
    mod test_reader; // failed
}
mod role {
    mod test_role_module; // success
    mod test_role_store; // success
}
mod router {
    mod test_router; // success
}
mod swap {
    mod test_swap_handler; // failed
}
mod utils {
    mod test_account_utils; // success
    mod test_arrays; // success
    mod test_calc; // success
    mod test_enumerable_set; // success
    mod test_i256; // success
    mod test_precision; // success
    mod test_reentrancy_guard; // success
    mod test_serializable_dict; // success
    mod test_starknet_utils; // success
    mod test_u256_mask; // success
}
mod withdrawal {
    mod test_withdrawal_vault; // working
}
mod mock {
    mod test_governable; // success
    mod test_referral_storage; // success
}
mod referral {
    mod test_referral_utils; // failed
}

mod integration {
    mod swap_test; // success
    mod test_create_and_execute_swap; // failed
    // mod test_swap_integration; // outdated
    mod test_long_integration; // success
    // mod test_deposit_withdrawal; // outdated
    mod test_short_integration; // failed
}
