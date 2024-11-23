import { Order } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { cairoIntToBigInt, toStarknetHexString } from "wolfy-sdk";

import { type WolfyEventWriter } from "../type";

import type { OrderType, WolfyEvent } from "wolfy-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("OrderCancelledWriter");

export const handleOrderCancelled: WolfyEventWriter<WolfyEvent.OrderCancelled> = async ({
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
            TradeHistoryEvent.OrderCancelled,
            order.order_type as OrderType
        ),
        cancelled_reason: event.reason,
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await order.save();
    order.delete();

    logger.info(`ORDER CANCELLED: ${order.id}`);
};
