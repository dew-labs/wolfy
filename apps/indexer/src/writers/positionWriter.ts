import { cairoIntToBigInt, OrderType, toStarknetHexString } from "satoru-sdk";
import { validateAndParseAddress } from "starknet";

import { createLogger } from "@freyr/shared/utils";
import { starknet } from "@snapshot-labs/checkpoint";

import { Order, Position } from "../../.checkpoint/models";

const logger = createLogger("PositionWriter");

export const handlePositionIncrease: starknet.Writer = async ({ block, tx, rawEvent, event }) => {
    if (!block || !event || !rawEvent) return;

    const author = validateAndParseAddress(rawEvent.from_address);
    const {
        position_key,
        market: marketAddress,
        is_long,
        collateral_amount,
        collateral_token,
        size_in_usd,
        size_delta_usd,
        size_in_tokens,
    } = event;

    const positionKey = toStarknetHexString(position_key as bigint);
    const position = new Position(positionKey);

    Object.assign(position, {
        author,
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

export const handlePositionDecrease: starknet.Writer = async ({ block, tx, rawEvent, event }) => {
    if (!block || !event || !rawEvent) return;

    const {
        position_key,
        collateral_amount,
        collateral_token,
        size_in_usd,
        size_delta_usd,
        size_in_tokens,
    } = event;

    const positionKey = toStarknetHexString(position_key as bigint);
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

    if (size_in_usd > 0) {
        await position.save();

        logger.info(`Position updated: ${position.id}`);
    } else {
        position.is_closed = true;
        await position.save();

        logger.info(`Position closed: ${position.id}`);
    }
};

export const handlePositionFeesCollected: starknet.Writer = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const { order_key, position_key } = event;
    const orderKey = toStarknetHexString(order_key as bigint);
    const positionKey = toStarknetHexString(position_key as bigint);

    const order = await Order.loadEntity(orderKey);
    if (!order) {
        logger.error(`Order not found for key: ${orderKey}`);
        return;
    }
    const position = await Position.loadEntity(positionKey);
    if (!position) {
        logger.error(`Position not found for key: ${positionKey}`);
        return;
    }

    if (order.order_type === OrderType.Liquidation) {
        position.is_liquidated = true;
        await position.save();

        logger.info(`Position liquidated: ${position.id}`);
    }
};
