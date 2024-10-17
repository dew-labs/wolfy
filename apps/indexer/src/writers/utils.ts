import { OrderType } from "satoru-sdk";
import { TradeHistoryEvent, TradeHistoryAction } from "packages/shared/src/interfaces";
import invariant from "tiny-invariant";

export const getTradeHistoryAction = (
    event: TradeHistoryEvent,
    type: OrderType
): TradeHistoryAction => {
    const mapping: Partial<Record<`${TradeHistoryEvent}-${OrderType}`, TradeHistoryAction>> = {
        // Market Order
        // Market Increase
        [`${TradeHistoryEvent.OrderCreated}-${OrderType.MarketIncrease}`]:
            TradeHistoryAction.RequestMarketIncrease,
        [`${TradeHistoryEvent.OrderExecuted}-${OrderType.MarketIncrease}`]:
            TradeHistoryAction.MarketIncrease,
        [`${TradeHistoryEvent.OrderFailed}-${OrderType.MarketIncrease}`]:
            TradeHistoryAction.FailedMarketIncrease,
        [`${TradeHistoryEvent.OrderCancelled}-${OrderType.MarketIncrease}`]:
            TradeHistoryAction.CancelMarketIncrease,

        // Market Decrease
        [`${TradeHistoryEvent.OrderCreated}-${OrderType.MarketDecrease}`]:
            TradeHistoryAction.RequestMarketDecrease,
        [`${TradeHistoryEvent.OrderExecuted}-${OrderType.MarketDecrease}`]:
            TradeHistoryAction.MarketDecrease,
        [`${TradeHistoryEvent.OrderFailed}-${OrderType.MarketDecrease}`]:
            TradeHistoryAction.FailedMarketDecrease,
        [`${TradeHistoryEvent.OrderCancelled}-${OrderType.MarketDecrease}`]:
            TradeHistoryAction.CancelMarketDecrease,

        // Trigger Order
        // Limit Order
        [`${TradeHistoryEvent.OrderCreated}-${OrderType.LimitIncrease}`]:
            TradeHistoryAction.CreateLimitOrder,
        [`${TradeHistoryEvent.OrderUpdated}-${OrderType.LimitIncrease}`]:
            TradeHistoryAction.UpdateLimitOrder,
        [`${TradeHistoryEvent.OrderExecuted}-${OrderType.LimitIncrease}`]:
            TradeHistoryAction.ExecuteLimitOrder,
        [`${TradeHistoryEvent.OrderFailed}-${OrderType.LimitIncrease}`]:
            TradeHistoryAction.FailedLimitOrder,
        [`${TradeHistoryEvent.OrderCancelled}-${OrderType.LimitIncrease}`]:
            TradeHistoryAction.CancelLimitOrder,

        // Take Profit Order
        [`${TradeHistoryEvent.OrderCreated}-${OrderType.LimitDecrease}`]:
            TradeHistoryAction.CreateTakeProfitOrder,
        [`${TradeHistoryEvent.OrderUpdated}-${OrderType.LimitDecrease}`]:
            TradeHistoryAction.UpdateTakeProfitOrder,
        [`${TradeHistoryEvent.OrderExecuted}-${OrderType.LimitDecrease}`]:
            TradeHistoryAction.ExecuteTakeProfitOrder,
        [`${TradeHistoryEvent.OrderFailed}-${OrderType.LimitDecrease}`]:
            TradeHistoryAction.FailedTakeProfitOrder,
        [`${TradeHistoryEvent.OrderCancelled}-${OrderType.LimitDecrease}`]:
            TradeHistoryAction.CancelTakeProfitOrder,

        // Stop Loss Order
        [`${TradeHistoryEvent.OrderCreated}-${OrderType.StopLossDecrease}`]:
            TradeHistoryAction.CreateStopLossOrder,
        [`${TradeHistoryEvent.OrderUpdated}-${OrderType.StopLossDecrease}`]:
            TradeHistoryAction.UpdateStopLossOrder,
        [`${TradeHistoryEvent.OrderExecuted}-${OrderType.StopLossDecrease}`]:
            TradeHistoryAction.ExecuteStopLossOrder,
        [`${TradeHistoryEvent.OrderFailed}-${OrderType.StopLossDecrease}`]:
            TradeHistoryAction.FailedStopLossOrder,
        [`${TradeHistoryEvent.OrderCancelled}-${OrderType.StopLossDecrease}`]:
            TradeHistoryAction.CancelStopLossOrder,

        // Swap Order
        // Market Swap
        [`${TradeHistoryEvent.OrderCreated}-${OrderType.MarketSwap}`]:
            TradeHistoryAction.RequestMarketSwap,
        [`${TradeHistoryEvent.OrderExecuted}-${OrderType.MarketSwap}`]:
            TradeHistoryAction.ExecuteMarketSwap,
        [`${TradeHistoryEvent.OrderFailed}-${OrderType.MarketSwap}`]:
            TradeHistoryAction.FailedMarketSwap,
        [`${TradeHistoryEvent.OrderCancelled}-${OrderType.MarketSwap}`]:
            TradeHistoryAction.CancelMarketSwap,

        // Limit Swap
        [`${TradeHistoryEvent.OrderCreated}-${OrderType.LimitSwap}`]:
            TradeHistoryAction.CreateLimitSwap,
        [`${TradeHistoryEvent.OrderUpdated}-${OrderType.LimitSwap}`]:
            TradeHistoryAction.UpdateLimitSwap,
        [`${TradeHistoryEvent.OrderExecuted}-${OrderType.LimitSwap}`]:
            TradeHistoryAction.ExecuteLimitSwap,
        [`${TradeHistoryEvent.OrderFailed}-${OrderType.LimitSwap}`]:
            TradeHistoryAction.FailedLimitSwap,
        [`${TradeHistoryEvent.OrderCancelled}-${OrderType.LimitSwap}`]:
            TradeHistoryAction.CancelLimitSwap,

        // Deposit
        [`${TradeHistoryEvent.DepositCreated}-${OrderType.MarketIncrease}`]:
            TradeHistoryAction.RequestDeposit,
        [`${TradeHistoryEvent.DepositExecuted}-${OrderType.MarketIncrease}`]:
            TradeHistoryAction.Deposit,
        [`${TradeHistoryEvent.DepositFailed}-${OrderType.MarketIncrease}`]:
            TradeHistoryAction.FailedDeposit,
        [`${TradeHistoryEvent.DepositCancelled}-${OrderType.MarketIncrease}`]:
            TradeHistoryAction.CancelDeposit,

        // Withdrawal
        [`${TradeHistoryEvent.WithdrawalCreated}-${OrderType.MarketDecrease}`]:
            TradeHistoryAction.RequestWithdraw,
        [`${TradeHistoryEvent.WithdrawalExecuted}-${OrderType.MarketDecrease}`]:
            TradeHistoryAction.Withdraw,
        [`${TradeHistoryEvent.WithdrawalFailed}-${OrderType.MarketDecrease}`]:
            TradeHistoryAction.FailedWithdraw,
        [`${TradeHistoryEvent.WithdrawalCancelled}-${OrderType.MarketDecrease}`]:
            TradeHistoryAction.CancelWithdraw,

        // Liquidation
        [`${TradeHistoryEvent.OrderExecuted}-${OrderType.Liquidation}`]:
            TradeHistoryAction.Liquidation,
    };

    const action = mapping[`${event}-${type}`];
    invariant(action !== undefined, `No action found for ${TradeHistoryEvent[event]} and ${type}`);

    return action;
};

export const getTradeHistoryAndOrderType = (
    action: TradeHistoryAction
): { event: TradeHistoryEvent; type: OrderType } => {
    const mapping: Partial<
        Record<TradeHistoryAction, { event: TradeHistoryEvent; type: OrderType }>
    > = {
        // Market Order
        // Market Increase
        [TradeHistoryAction.RequestMarketIncrease]: {
            event: TradeHistoryEvent.OrderCreated,
            type: OrderType.MarketIncrease,
        },
        [TradeHistoryAction.MarketIncrease]: {
            event: TradeHistoryEvent.OrderExecuted,
            type: OrderType.MarketIncrease,
        },
        [TradeHistoryAction.FailedMarketIncrease]: {
            event: TradeHistoryEvent.OrderFailed,
            type: OrderType.MarketIncrease,
        },
        [TradeHistoryAction.CancelMarketIncrease]: {
            event: TradeHistoryEvent.OrderCancelled,
            type: OrderType.MarketIncrease,
        },

        // Market Decrease
        [TradeHistoryAction.RequestMarketDecrease]: {
            event: TradeHistoryEvent.OrderCreated,
            type: OrderType.MarketDecrease,
        },
        [TradeHistoryAction.MarketDecrease]: {
            event: TradeHistoryEvent.OrderExecuted,
            type: OrderType.MarketDecrease,
        },
        [TradeHistoryAction.FailedMarketDecrease]: {
            event: TradeHistoryEvent.OrderFailed,
            type: OrderType.MarketDecrease,
        },
        [TradeHistoryAction.CancelMarketDecrease]: {
            event: TradeHistoryEvent.OrderCancelled,
            type: OrderType.MarketDecrease,
        },

        // Trigger Order
        // Limit Order
        [TradeHistoryAction.CreateLimitOrder]: {
            event: TradeHistoryEvent.OrderCreated,
            type: OrderType.LimitIncrease,
        },
        [TradeHistoryAction.UpdateLimitOrder]: {
            event: TradeHistoryEvent.OrderUpdated,
            type: OrderType.LimitIncrease,
        },
        [TradeHistoryAction.ExecuteLimitOrder]: {
            event: TradeHistoryEvent.OrderExecuted,
            type: OrderType.LimitIncrease,
        },
        [TradeHistoryAction.FailedLimitOrder]: {
            event: TradeHistoryEvent.OrderFailed,
            type: OrderType.LimitIncrease,
        },
        [TradeHistoryAction.CancelLimitOrder]: {
            event: TradeHistoryEvent.OrderCancelled,
            type: OrderType.LimitIncrease,
        },

        // Take Profit Order
        [TradeHistoryAction.CreateTakeProfitOrder]: {
            event: TradeHistoryEvent.OrderCreated,
            type: OrderType.LimitDecrease,
        },
        [TradeHistoryAction.UpdateTakeProfitOrder]: {
            event: TradeHistoryEvent.OrderUpdated,
            type: OrderType.LimitDecrease,
        },
        [TradeHistoryAction.ExecuteTakeProfitOrder]: {
            event: TradeHistoryEvent.OrderExecuted,
            type: OrderType.LimitDecrease,
        },
        [TradeHistoryAction.FailedTakeProfitOrder]: {
            event: TradeHistoryEvent.OrderFailed,
            type: OrderType.LimitDecrease,
        },
        [TradeHistoryAction.CancelTakeProfitOrder]: {
            event: TradeHistoryEvent.OrderCancelled,
            type: OrderType.LimitDecrease,
        },

        // Stop Loss Order
        [TradeHistoryAction.CreateStopLossOrder]: {
            event: TradeHistoryEvent.OrderCreated,
            type: OrderType.StopLossDecrease,
        },
        [TradeHistoryAction.UpdateStopLossOrder]: {
            event: TradeHistoryEvent.OrderUpdated,
            type: OrderType.StopLossDecrease,
        },
        [TradeHistoryAction.ExecuteStopLossOrder]: {
            event: TradeHistoryEvent.OrderExecuted,
            type: OrderType.StopLossDecrease,
        },
        [TradeHistoryAction.FailedStopLossOrder]: {
            event: TradeHistoryEvent.OrderFailed,
            type: OrderType.StopLossDecrease,
        },
        [TradeHistoryAction.CancelStopLossOrder]: {
            event: TradeHistoryEvent.OrderCancelled,
            type: OrderType.StopLossDecrease,
        },

        // Swap Order
        // Market Swap
        [TradeHistoryAction.RequestMarketSwap]: {
            event: TradeHistoryEvent.OrderCreated,
            type: OrderType.MarketSwap,
        },
        [TradeHistoryAction.ExecuteMarketSwap]: {
            event: TradeHistoryEvent.OrderExecuted,
            type: OrderType.MarketSwap,
        },
        [TradeHistoryAction.FailedMarketSwap]: {
            event: TradeHistoryEvent.OrderFailed,
            type: OrderType.MarketSwap,
        },
        [TradeHistoryAction.CancelMarketSwap]: {
            event: TradeHistoryEvent.OrderCancelled,
            type: OrderType.MarketSwap,
        },

        // Limit Swap
        [TradeHistoryAction.CreateLimitSwap]: {
            event: TradeHistoryEvent.OrderCreated,
            type: OrderType.LimitSwap,
        },
        [TradeHistoryAction.UpdateLimitSwap]: {
            event: TradeHistoryEvent.OrderUpdated,
            type: OrderType.LimitSwap,
        },
        [TradeHistoryAction.ExecuteLimitSwap]: {
            event: TradeHistoryEvent.OrderExecuted,
            type: OrderType.LimitSwap,
        },
        [TradeHistoryAction.FailedLimitSwap]: {
            event: TradeHistoryEvent.OrderFailed,
            type: OrderType.LimitSwap,
        },
        [TradeHistoryAction.CancelLimitSwap]: {
            event: TradeHistoryEvent.OrderCancelled,
            type: OrderType.LimitSwap,
        },

        // Deposit
        [TradeHistoryAction.RequestDeposit]: {
            event: TradeHistoryEvent.DepositCreated,
            type: OrderType.MarketIncrease,
        },
        [TradeHistoryAction.Deposit]: {
            event: TradeHistoryEvent.DepositExecuted,
            type: OrderType.MarketIncrease,
        },
        [TradeHistoryAction.FailedDeposit]: {
            event: TradeHistoryEvent.DepositFailed,
            type: OrderType.MarketIncrease,
        },
        [TradeHistoryAction.CancelDeposit]: {
            event: TradeHistoryEvent.DepositCancelled,
            type: OrderType.MarketIncrease,
        },

        // Withdrawal
        [TradeHistoryAction.RequestWithdraw]: {
            event: TradeHistoryEvent.WithdrawalCreated,
            type: OrderType.MarketDecrease,
        },
        [TradeHistoryAction.Withdraw]: {
            event: TradeHistoryEvent.WithdrawalExecuted,
            type: OrderType.MarketDecrease,
        },
        [TradeHistoryAction.FailedWithdraw]: {
            event: TradeHistoryEvent.WithdrawalFailed,
            type: OrderType.MarketDecrease,
        },
        [TradeHistoryAction.CancelWithdraw]: {
            event: TradeHistoryEvent.WithdrawalCancelled,
            type: OrderType.MarketDecrease,
        },

        // Liquidation
        [TradeHistoryAction.Liquidation]: {
            event: TradeHistoryEvent.OrderExecuted,
            type: OrderType.Liquidation,
        },
    };

    const eventAndType = mapping[action];
    invariant(eventAndType, `No event and type found for ${action}`);

    return eventAndType;
};
