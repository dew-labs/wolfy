import { Deposit } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { cairoIntToBigInt, OrderType, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { SatoruEvent } from "satoru-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("DepositExecutedWriter");

export const handleDepositExecuted: SatoruEventWriter<SatoruEvent.DepositExecuted> = async ({
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
        key,
        action: getTradeHistoryAction(TradeHistoryEvent.DepositExecuted, OrderType.MarketIncrease),
        long_token_amount: cairoIntToBigInt(event.long_token_amount),
        short_token_amount: cairoIntToBigInt(event.short_token_amount),
        received_market_tokens: cairoIntToBigInt(event.received_market_tokens),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await deposit.save();

    logger.info(`DEPOSIT EXECUTED: ${deposit.id}`);
};
