import { Position } from "apps/indexer/.checkpoint/models";
import { createLogger } from "packages/shared/src/utils";
import { cairoIntToBigInt, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { ParsedSatoruEvent, SatoruEvent } from "satoru-sdk";
import type { FullBlock, Transaction } from "@snapshot-labs/checkpoint/dist/src/providers/starknet";

const logger = createLogger("PositionDecreaseWriter");

export const handlePositionDecrease: SatoruEventWriter<SatoruEvent.PositionDecrease> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    await saveOrRemovePosition(event, tx, block);
};

const saveOrRemovePosition = async (
    event: ParsedSatoruEvent<SatoruEvent.PositionDecrease>,
    tx: Transaction,
    block: FullBlock
) => {
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
        await position.delete();

        logger.info(`Position closed: ${position.id}`);
    }
};
