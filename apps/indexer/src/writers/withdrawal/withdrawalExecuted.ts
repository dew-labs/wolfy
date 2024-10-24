import { Withdrawal } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { OrderType, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { SatoruEvent } from "satoru-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("WithdrawalExecutedWriter");

export const handleWithdrawalExecuted: SatoruEventWriter<SatoruEvent.WithdrawalExecuted> = async ({
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
        key,
        action: getTradeHistoryAction(
            TradeHistoryEvent.WithdrawalExecuted,
            OrderType.MarketDecrease
        ),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await withdrawal.save();

    logger.info(`WITHDRAWAL EXECUTED: ${withdrawal.id}`);
};
