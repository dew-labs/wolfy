import { Order } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import {
    cairoIntToBigInt,
    parseDecreasePositionSwapType,
    parseOrderType,
    toStarknetHexString,
} from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { SatoruEvent } from "satoru-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("OrderCreatedWriter");

export const handleOrderCreated: SatoruEventWriter<SatoruEvent.OrderCreated> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const key = toStarknetHexString(event.key);
    const order = new Order(key);
    const orderType = parseOrderType(event.order.order_type);

    Object.assign(order, {
        key,
        account: toStarknetHexString(event.order.account),
        receiver: toStarknetHexString(event.order.receiver),
        market: toStarknetHexString(event.order.market),
        action: getTradeHistoryAction(TradeHistoryEvent.OrderCreated, orderType),
        order_type: orderType,
        is_long: event.order.is_long,
        trigger_price: cairoIntToBigInt(event.order.trigger_price),
        acceptable_price: cairoIntToBigInt(event.order.acceptable_price),
        size_delta_usd: cairoIntToBigInt(event.order.size_delta_usd),
        initial_collateral_token: toStarknetHexString(event.order.initial_collateral_token),
        initial_collateral_delta_amount: cairoIntToBigInt(
            event.order.initial_collateral_delta_amount
        ),
        is_frozen: event.order.is_frozen,
        swap_path: event.order.swap_path.snapshot.map(toStarknetHexString),
        decrease_position_swap_type: parseDecreasePositionSwapType(
            event.order.decrease_position_swap_type
        ),
        execution_fee: cairoIntToBigInt(event.order.execution_fee),
        ui_fee_receiver: toStarknetHexString(event.order.ui_fee_receiver),
        callback_contract: toStarknetHexString(event.order.callback_contract),
        callback_gas_limit: cairoIntToBigInt(event.order.callback_gas_limit),
        min_output_amount: cairoIntToBigInt(event.order.min_output_amount),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await order.save();

    logger.info(`ORDER CREATED: ${order.id}`);
};
