// Wolfy imports
use freyr::event::event_utils::LogData;
use freyr::withdrawal::withdrawal::Withdrawal;

// *************************************************************************
//                  Interface of the `WithdrawalCallbackReceiver` contract.
// *************************************************************************
#[starknet::interface]
trait IWithdrawalCallbackReceiver<TContractState> {
    /// Called after a withdrawal execution.
    /// # Arguments
    /// * `key` - They key of the withdrawal.
    /// * `withdrawal` - The withdrawal that was executed.
    /// * `log_data` - The log data.
    // TODO uncomment withdrawal when available
    fn after_withdrawal_execution(
        ref self: TContractState, key: felt252, withdrawal: Withdrawal, log_data: Array<felt252>,
    );

    /// Called after an withdrawal cancellation.
    /// # Arguments
    /// * `key` - They key of the withdrawal.
    /// * `withdrawal` - The withdrawal that was cancelled.
    /// * `log_data` - The log data.
    fn after_withdrawal_cancellation(
        ref self: TContractState, key: felt252, withdrawal: Withdrawal, log_data: Array<felt252>,
    );
}
