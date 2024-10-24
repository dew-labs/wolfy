import { Position } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { cairoIntToBigInt, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { SatoruEvent } from "satoru-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("PositionIncreaseWriter");

export const handlePositionIncrease: SatoruEventWriter<SatoruEvent.PositionIncrease> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const position = new Position(toStarknetHexString(event.position_key));

    Object.assign(position, {
        key: toStarknetHexString(event.position_key),
        order_key: toStarknetHexString(event.order_key),
        account: toStarknetHexString(event.account),
        market: toStarknetHexString(event.market),
        action: getTradeHistoryAction(TradeHistoryEvent.PositionIncrease, ""),
        is_long: event.is_long,
        execution_price: cairoIntToBigInt(event.execution_price),
        size_in_tokens: cairoIntToBigInt(event.size_in_tokens),
        size_in_usd: cairoIntToBigInt(event.size_in_usd),
        size_delta_in_tokens: cairoIntToBigInt(event.size_delta_in_tokens),
        size_delta_usd: cairoIntToBigInt(event.size_delta_usd),
        index_token_price_min: cairoIntToBigInt(event.index_token_price_min),
        index_token_price_max: cairoIntToBigInt(event.index_token_price_max),
        collateral_token: toStarknetHexString(event.collateral_token),
        collateral_token_price_min: cairoIntToBigInt(event.collateral_token_price_min),
        collateral_token_price_max: cairoIntToBigInt(event.collateral_token_price_max),
        collateral_amount: cairoIntToBigInt(event.collateral_amount),
        collateral_delta_amount: cairoIntToBigInt(event.collateral_delta_amount),
        price_impact_usd: cairoIntToBigInt(event.price_impact_usd),
        price_impact_amount: cairoIntToBigInt(event.price_impact_amount),
        borrowing_factor: cairoIntToBigInt(event.borrowing_factor),
        funding_fee_amount_per_size: cairoIntToBigInt(event.funding_fee_amount_per_size),
        long_token_claimable_funding_amount_per_size: cairoIntToBigInt(
            event.long_token_claimable_funding_amount_per_size
        ),
        short_token_claimable_funding_amount_per_size: cairoIntToBigInt(
            event.short_token_claimable_funding_amount_per_size
        ),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await position.save();

    logger.info(`POSITION INCREASE: ${position.id}`);
};
