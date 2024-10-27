import { Order } from "apps/indexer/.checkpoint/models";
import { createLogger, isLiquidationOrder } from "@freyr/shared/utils";
import { parseOrderType, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import { OrderType, type SatoruEvent } from "satoru-sdk";
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

    if (isLiquidationOrder(parseOrderType(order.order_type))) {
        order.delete();
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

    logger.info(`ORDER EXECUTED: ${order.id}`);
};
