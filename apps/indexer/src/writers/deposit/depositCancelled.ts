import { Deposit } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { OrderType, toStarknetHexString } from "wolfy-sdk";

import { type WolfyEventWriter } from "../type";

import type { WolfyEvent } from "wolfy-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("DepositCancelledWriter");

export const handleDepositCancelled: WolfyEventWriter<WolfyEvent.DepositCancelled> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const key = toStarknetHexString(event.key);
    const deposit = await Deposit.loadEntity(key);
    if (!deposit) {
        logger.error(`Deposit not found for key: ${key}`);
        return;
    }

    Object.assign(deposit, {
        action: getTradeHistoryAction(TradeHistoryEvent.DepositCancelled, OrderType.MarketIncrease),
        cancelled_reason: event.reason,
        cancelled_reason_key: event.reason_bytes,
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await deposit.save();
    deposit.delete();

    logger.info(`DEPOSIT CANCELLED: ${deposit.id}`);
};
