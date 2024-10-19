import { TradeHistory } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { cairoIntToBigInt, OrderType, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { ParsedSatoruEvent, SatoruEvent } from "satoru-sdk";
import type { FullBlock, Transaction } from "@snapshot-labs/checkpoint/dist/src/providers/starknet";
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

    await saveOrRemovePosition(event, tx, block);
};

const saveOrRemovePosition = async (
    event: ParsedSatoruEvent<SatoruEvent.WithdrawalExecuted>,
    tx: Transaction,
    block: FullBlock
) => {
    await saveTradeHistory(event, tx, block);
};

const saveTradeHistory = async (
    event: ParsedSatoruEvent<SatoruEvent.WithdrawalExecuted>,
    tx: Transaction,
    block: FullBlock
) => {
    const { key } = event;

    const tradeHistory = await TradeHistory.loadEntity(toStarknetHexString(key));
    if (!tradeHistory) {
        logger.error(`Trade history not found for key: ${key}`);
        return;
    }

    Object.assign(tradeHistory, {
        action: getTradeHistoryAction(
            TradeHistoryEvent.WithdrawalExecuted,
            OrderType.MarketDecrease
        ),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await tradeHistory.save();

    logger.info(`Trade history created: ${tradeHistory.id}`);
};
