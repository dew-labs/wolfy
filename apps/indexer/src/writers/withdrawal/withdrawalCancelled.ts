import { Withdrawal } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { OrderType, toStarknetHexString } from "wolfy-sdk";

import { type WolfyEventWriter } from "../type";

import type { WolfyEvent } from "wolfy-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("WithdrawalCancelledWriter");

export const handleWithdrawalCancelled: WolfyEventWriter<WolfyEvent.WithdrawalCancelled> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const key = toStarknetHexString(event.key);
    const withdrawal = await Withdrawal.loadEntity(key);
    if (!withdrawal) {
        logger.error(`Withdrawal not found for key: ${key}`);
        return;
    }

    Object.assign(withdrawal, {
        action: getTradeHistoryAction(
            TradeHistoryEvent.WithdrawalCancelled,
            OrderType.MarketDecrease
        ),
        cancelled_reason: event.reason,
        cancelled_reason_key: event.reason_bytes,
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await withdrawal.save();
    withdrawal.delete();

    logger.info(`WITHDRAWAL CANCELLED: ${withdrawal.id}`);
};
