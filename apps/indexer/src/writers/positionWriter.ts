import { createLogger } from "@freyr/shared/utils";
import { cairoIntToBigInt, OrderType, SatoruEvent, toStarknetHexString } from "satoru-sdk";

import { Order, Position } from "../../.checkpoint/models";
import type { SatoruEventWriter } from "./type";

const logger = createLogger("PositionWriter");

export const handlePositionIncrease: SatoruEventWriter<SatoruEvent.PositionIncrease> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const {
        position_key,
        account,
        market: marketAddress,
        is_long,
        collateral_amount,
        collateral_token,
        size_in_usd,
        size_delta_usd,
        size_in_tokens,
    } = event;

    const positionKey = toStarknetHexString(position_key);
    const position = new Position(positionKey);

    Object.assign(position, {
        account: toStarknetHexString(account),
        key: positionKey,
        market: toStarknetHexString(marketAddress),
        is_long,
        collateral_amount: String(cairoIntToBigInt(collateral_amount)),
        collateral_token,
        size_in_usd: String(cairoIntToBigInt(size_in_usd)),
        size_delta_usd: String(cairoIntToBigInt(size_delta_usd)),
        size_in_tokens: String(cairoIntToBigInt(size_in_tokens)),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await position.save();

    logger.info(`Position created: ${position.id}`);
};

export const handlePositionDecrease: SatoruEventWriter<SatoruEvent.PositionDecrease> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const {
        position_key,
        collateral_amount,
        collateral_token,
        size_in_usd,
        size_delta_usd,
        size_in_tokens,
    } = event;

    const positionKey = toStarknetHexString(position_key);
    const position = await Position.loadEntity(positionKey);
    if (!position) {
        logger.error(`Position not found for key: ${positionKey}`);
        return;
    }

    Object.assign(position, {
        collateral_amount: String(cairoIntToBigInt(collateral_amount)),
        collateral_token,
        size_in_usd: cairoIntToBigInt(size_in_usd),
        size_delta_usd: cairoIntToBigInt(size_delta_usd),
        size_in_tokens: cairoIntToBigInt(size_in_tokens),
        tx_hash: tx.transaction_hash,
    });

    if (cairoIntToBigInt(size_in_usd) > 0) {
        await position.save();

        logger.info(`Position updated: ${position.id}`);
    } else {
        position.is_closed = true;
        await position.save();

        logger.info(`Position closed: ${position.id}`);
    }
};

export const handlePositionFeesCollected: SatoruEventWriter<
    SatoruEvent.PositionFeesCollected
> = async ({ block, tx, rawEvent, event }) => {
    if (!block || !event || !rawEvent) return;

    const { order_key, position_key } = event;
    const orderKey = toStarknetHexString(order_key);
    const positionKey = toStarknetHexString(position_key);

    const order = await Order.loadEntity(orderKey);
    if (!order) {
        logger.error(`Order not found for key: ${orderKey}`);
        return;
    }

    if (order.order_type === OrderType.Liquidation) {
        const position = await Position.loadEntity(positionKey);
        if (!position) {
            logger.error(`Position not found for key: ${positionKey}`);
            return;
        }

        position.is_liquidated = true;
        await position.save();

        logger.info(`Position liquidated: ${position.id}`);
    }
};
