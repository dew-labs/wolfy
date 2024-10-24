import { Order } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { OrderType, SatoruEvent } from "satoru-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("OrderExecutedWriter");

export const handleOrderExecuted: SatoruEventWriter<SatoruEvent.OrderExecuted> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const key = toStarknetHexString(event.key);
    const order = await Order.loadEntity(key);
    if (!order) {
        logger.error(`Order not found for key: ${key}`);
        return;
    }

    Object.assign(order, {
        action: getTradeHistoryAction(
            TradeHistoryEvent.OrderExecuted,
            order.order_type as OrderType
        ),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await order.save();
    order.delete();

    logger.info(`ORDER CANCELLED: ${order.id}`);
};
