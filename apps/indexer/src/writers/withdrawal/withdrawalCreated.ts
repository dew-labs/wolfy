import { Withdrawal } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { cairoIntToBigInt, OrderType, toStarknetHexString } from "wolfy-sdk";

import { type WolfyEventWriter } from "../type";

import type { WolfyEvent } from "wolfy-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("WithdrawalCreatedWriter");

export const handleWithdrawalCreated: WolfyEventWriter<WolfyEvent.WithdrawalCreated> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const withdrawal = new Withdrawal(toStarknetHexString(event.key));

    Object.assign(withdrawal, {
        key: toStarknetHexString(event.key),
        account: toStarknetHexString(event.account),
        receiver: toStarknetHexString(event.receiver),
        market: toStarknetHexString(event.market),
        action: getTradeHistoryAction(
            TradeHistoryEvent.WithdrawalCreated,
            OrderType.MarketDecrease
        ),
        min_long_token_amount: cairoIntToBigInt(event.min_long_token_amount),
        min_short_token_amount: cairoIntToBigInt(event.min_short_token_amount),
        market_token_amount: cairoIntToBigInt(event.market_token_amount),
        execution_fee: cairoIntToBigInt(event.execution_fee),
        long_token_swap_path: event.long_token_swap_path.snapshot.map(toStarknetHexString),
        short_token_swap_path: event.short_token_swap_path.snapshot.map(toStarknetHexString),
        callback_contract: toStarknetHexString(event.callback_contract),
        callback_gas_limit: cairoIntToBigInt(event.callback_gas_limit),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await withdrawal.save();

    logger.info(`WITHDRAWAL CREATED: ${withdrawal.id}`);
};
