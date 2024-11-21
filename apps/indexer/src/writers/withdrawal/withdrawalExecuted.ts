import { Withdrawal } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { OrderType, toStarknetHexString } from "wolfy-sdk";

import { type WolfyEventWriter } from "../type";

import type { WolfyEvent } from "wolfy-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("WithdrawalExecutedWriter");

export const handleWithdrawalExecuted: WolfyEventWriter<WolfyEvent.WithdrawalExecuted> = async ({
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
