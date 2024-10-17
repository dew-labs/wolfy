import { Order, TradeHistory } from "apps/indexer/.checkpoint/models";
import { TradeHistoryEvent } from "packages/shared/src/interfaces";
import { createLogger } from "packages/shared/src/utils";
import { toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";
import { getTradeHistoryAction, getTradeHistoryAndOrderType } from "../utils";

import type { ParsedSatoruEvent, SatoruEvent } from "satoru-sdk";
import type { FullBlock, Transaction } from "@snapshot-labs/checkpoint/dist/src/providers/starknet";

const logger = createLogger("OrderCancelledWriter");

export const handleOrderCancelled: SatoruEventWriter<SatoruEvent.OrderCancelled> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    await Promise.all([deleteOrder(event), saveTradeHistory(event, tx, block)]);
};

const deleteOrder = async (event: ParsedSatoruEvent<SatoruEvent.OrderCancelled>) => {
    const key = toStarknetHexString(event.key);

    const order = await Order.loadEntity(key);
    if (!order) {
        logger.error(`Order not found for key: ${key}`);
        return;
    }

    await order.delete();

    logger.info(`Order executed: ${order.id}`);
};

const saveTradeHistory = async (
    event: ParsedSatoruEvent<SatoruEvent.OrderCancelled>,
    tx: Transaction,
    block: FullBlock
) => {
    const key = toStarknetHexString(event.key);

    const tradeHistory = await TradeHistory.loadEntity(key);
    if (!tradeHistory) {
        logger.error(`Trade history not found for key: ${key}`);
        return;
    }

    const { type } = getTradeHistoryAndOrderType(tradeHistory.action);

    Object.assign(tradeHistory, {
        action: getTradeHistoryAction(TradeHistoryEvent.OrderCancelled, type),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await tradeHistory.save();

    logger.info(`Trade history created: ${tradeHistory.id}`);
};
