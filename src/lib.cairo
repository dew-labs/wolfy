// Declare modules.

// `adl` is a module to help with auto-deleveraging.
mod adl {
    mod adl_utils;
    mod error;
}

// `bank` is a module handling storing and transferring of tokens.
mod bank {
    mod bank;
    mod error;
    mod strict_bank;
}

// `callback` is a module that allows for better composability with other contracts.
mod callback {
    mod callback_utils;
    mod error;
    mod mocks;
    mod deposit_callback_receiver {
        mod interface;
    }
    mod order_callback_receiver {
        mod interface;
    }
    mod withdrawal_callback_receiver {
        mod interface;
    }
}

// `config` is a module that contains the configuration for the system.
mod config {
    mod config;
    mod error;
    mod timelock; // not implemented
}

// `event` is a module event management functions.
mod event {
    mod event_emitter;
    mod event_utils;
}

// `data` is a module that contains the data store for the system.
mod data {
    mod data_store;
    mod error;
    mod keys;
}

// `deposit` handles the depositing of funds into the system.
mod deposit {
    mod deposit;
    mod deposit_utils;
    mod deposit_vault;
    mod error;
    mod execute_deposit_utils;
}

// `exchange` contains main satoru handlers to create and execute actions.
mod exchange {
    mod adl_handler;
    mod base_order_handler;
    mod deposit_handler;
    mod error;
    mod exchange_utils;
    mod liquidation_handler;
    mod order_handler;
    mod withdrawal_handler;
}

// `feature` is used to validate if a feature is enabled or disabled.
mod feature {
    mod error;
    mod feature_utils;
}

// `fee` is used for fees actions.
mod fee {
    mod error;
    mod fee_handler;
    mod fee_utils;
}

// `gas` is used for execution fee estimation and payments.
mod gas {
    mod error;
    mod gas_utils;
}

// `nonce` is a module that maintains a progressively increasing nonce value.
mod nonce {
    mod nonce_utils;
}

// 'reader' is a module that retrieves the financial market data and trading utility.
mod reader {
    mod error;
    mod reader;
    mod reader_pricing_utils;
    mod reader_utils;
}

// 'router' is a module where users utilize the router to initiate token transactions, exchanges, and transfers.
mod router {
    mod error;
    mod exchange_router;
    mod router;
}

// `role` is a module that contains the role store and role management functions.
mod role {
    // Custom errors.
    mod error;
    // The definition of the different roles in the system.
    mod role;
    // The contract handling the role modifiers
    mod role_module;
    // The contract handling the roles and store them.
    mod role_store;
}

// `price` contains utility functions for calculating prices.
mod price {
    mod price;
}

// `utils` contains utility functions.
mod utils {
    mod account_utils;
    mod arrays;
    mod bits;
    mod calc;
    mod default;
    mod enumerable_set;
    mod enumerable_values;
    mod error;
    mod error_utils;
    mod felt_math;
    mod global_reentrancy_guard;
    mod hash;
    mod i256;
    mod i256_test_storage_contract;
    mod precision;
    mod serializable_dict;
    mod span32;
    mod starknet_utils;
    mod store_arrays;
    mod traits;
    mod u256_mask;
}

// `liquidation` function to help with liquidations.
mod liquidation {
    mod liquidation_utils;
}

// `market` contains market management functions.
mod market {
    mod error;
    mod market;
    mod market_factory;
    mod market_pool_value_info;
    mod market_store_utils;
    mod market_token;
    mod market_utils;
}

mod mock {
    mod error;
    mod governable;
    mod mock_account;
    mod referral_storage;
}

// `oracle` contains functions related to oracles used by Satoru.
mod oracle {
    mod error;
    mod oracle;
    mod oracle_modules;
    mod oracle_store;
    mod oracle_utils;
    mod price_feed;
    mod interfaces {
        mod account;
    }
}

// `order` contains order management functions.
mod order {
    mod base_order_utils;
    mod decrease_order_utils;
    mod error;
    mod increase_order_utils;
    mod order;
    mod order_utils;
    mod order_vault;
    mod swap_order_utils;
}

// `position` contains positions management functions
mod position {
    mod decrease_position_collateral_utils;
    mod decrease_position_swap_utils;
    mod decrease_position_utils;
    mod error;
    mod increase_position_utils;
    mod position;
    mod position_event_utils;
    mod position_utils;
}

// `pricing` contains pricing utils
mod pricing {
    mod error;
    mod position_pricing_utils;
    mod pricing_utils;
    mod swap_pricing_utils;
}

// `referral` contains referral logic.
mod referral {
    mod referral_tier;
    mod referral_utils;
}

mod swap {
    mod error;
    mod swap_handler;
    mod swap_utils;
}

// Copied from `https://github.com/OpenZeppelin/cairo-contracts/blob/cairo-2/src/token`.
// TODO: Use openzeppelin as dependency when Scarb versions match.
mod token {
    mod erc20;
    mod token_utils;
}

mod test_utils {
    mod deposit_setup;
    mod tests_lib;
}

// `withdrawal` contains withdrawal management functions
mod withdrawal {
    mod error;
    mod withdrawal;
    mod withdrawal_utils;
    mod withdrawal_vault;
}
