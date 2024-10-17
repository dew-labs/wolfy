import { Position } from "apps/indexer/.checkpoint/models";
import { createLogger } from "packages/shared/src/utils";
import { cairoIntToBigInt, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { ParsedSatoruEvent, SatoruEvent } from "satoru-sdk";
import type { FullBlock, Transaction } from "@snapshot-labs/checkpoint/dist/src/providers/starknet";

const logger = createLogger("PositionIncreaseWriter");

export const handlePositionIncrease: SatoruEventWriter<SatoruEvent.PositionIncrease> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    await savePosition(event, tx, block);
};

const savePosition = async (
    event: ParsedSatoruEvent<SatoruEvent.PositionIncrease>,
    tx: Transaction,
    block: FullBlock
) => {
    const {
        position_key,
        account,
        market,
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
        market: toStarknetHexString(market),
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
