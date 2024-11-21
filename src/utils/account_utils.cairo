// *************************************************************************
//                                  IMPORTS
// *************************************************************************
// Core lib imports.

// Local imports.
use satoru::utils::error::UtilsError;
use starknet::ContractAddress;

/// Validates an account.
/// # Arguments
/// * `account` - Account to validate.
fn validate_account(account: ContractAddress) {
    assert(account.is_non_zero(), UtilsError::NULL_ACCOUNT);
}

/// Validates a receiver.
/// # Arguments
/// * `receiver` - Account to validate.
fn validate_receiver(receiver: ContractAddress) {
    assert(receiver.is_non_zero(), UtilsError::NULL_RECEIVER);
}
