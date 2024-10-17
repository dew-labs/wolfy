import { Order, Position, TradeHistory } from "apps/indexer/.checkpoint/models";
import { TradeHistoryEvent } from "packages/shared/src/interfaces";
import { createLogger, hashPositionKey } from "packages/shared/src/utils";
import { OrderType, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";
import { getTradeHistoryAction, getTradeHistoryAndOrderType } from "../utils";

import type { ParsedSatoruEvent, SatoruEvent } from "satoru-sdk";
import type { FullBlock, Transaction } from "@snapshot-labs/checkpoint/dist/src/providers/starknet";

const logger = createLogger("OrderExecutedWriter");

export const handleOrderExecuted: SatoruEventWriter<SatoruEvent.OrderExecuted> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    await Promise.all([deleteOrder(event), saveTradeHistory(event, tx, block)]);
};

const deleteOrder = async (event: ParsedSatoruEvent<SatoruEvent.OrderExecuted>) => {
    const key = toStarknetHexString(event.key);

    const order = await Order.loadEntity(key);
    if (!order) {
        return;
    }

    deletePosition(order);
    await order.delete();

    logger.info(`Order executed: ${order.id}`);
};

const deletePosition = async (order: Order) => {
    if (order.order_type !== OrderType.Liquidation) {
        return;
    }

    const positionKey = toStarknetHexString(
        hashPositionKey(order.account, order.market, order.initial_collateral_token, order.is_long)
    );

    const position = await Position.loadEntity(positionKey);
    if (!position) {
        logger.error(`Position not found for key: ${positionKey}`);
        return;
    }
    position.delete();
};

const saveTradeHistory = async (
    event: ParsedSatoruEvent<SatoruEvent.OrderExecuted>,
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
        action: getTradeHistoryAction(TradeHistoryEvent.OrderExecuted, type),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await tradeHistory.save();

    logger.info(`Trade history created: ${tradeHistory.id}`);
};
