export enum TradeHistoryAction {
    // Market Order
    // Market Increase
    RequestMarketIncrease,
    MarketIncrease,
    FailedMarketIncrease,
    CancelMarketIncrease,

    // Market Decrease
    RequestMarketDecrease,
    MarketDecrease,
    FailedMarketDecrease,
    CancelMarketDecrease,

    // Trigger Order
    // Limit Order
    CreateLimitOrder,
    UpdateLimitOrder,
    ExecuteLimitOrder,
    FailedLimitOrder,
    CancelLimitOrder,

    // Take Profit Order
    CreateTakeProfitOrder,
    UpdateTakeProfitOrder,
    ExecuteTakeProfitOrder,
    FailedTakeProfitOrder,
    CancelTakeProfitOrder,

    // Stop Loss Order
    CreateStopLossOrder,
    UpdateStopLossOrder,
    ExecuteStopLossOrder,
    FailedStopLossOrder,
    CancelStopLossOrder,

    // Swap Order
    // Market Swap
    RequestMarketSwap,
    ExecuteMarketSwap,
    FailedMarketSwap,
    CancelMarketSwap,

    // Limit Swap
    CreateLimitSwap,
    UpdateLimitSwap,
    ExecuteLimitSwap,
    FailedLimitSwap,
    CancelLimitSwap,

    // Deposit
    RequestDeposit,
    Deposit,
    FailedDeposit,
    CancelDeposit,

    // Withdrawal
    RequestWithdraw,
    Withdraw,
    FailedWithdraw,
    CancelWithdraw,

    // Liquidation,
    Liquidation,
}

export enum TradeHistoryEvent {
    // Order
    OrderCreated,
    OrderUpdated,
    OrderExecuted,
    OrderFailed,
    OrderCancelled,

    // Deposit
    DepositCreated,
    DepositExecuted,
    DepositFailed,
    DepositCancelled,

    // Withdrawal
    WithdrawalCreated,
    WithdrawalExecuted,
    WithdrawalFailed,
    WithdrawalCancelled,
}
