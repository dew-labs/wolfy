import { Market } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { toStarknetHexString } from "wolfy-sdk";

import { type WolfyEventWriter } from "../type";

import type { WolfyEvent } from "wolfy-sdk";

const logger = createLogger("MarketCreatedWriter");

export const handleMarketCreated: WolfyEventWriter<WolfyEvent.MarketCreated> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const market = new Market(event.market_token);

    Object.assign(market, {
        creator: toStarknetHexString(event.creator),
        market_token: toStarknetHexString(event.market_token),
        index_token: toStarknetHexString(event.index_token),
        long_token: toStarknetHexString(event.long_token),
        short_token: toStarknetHexString(event.short_token),
        market_type: toStarknetHexString(event.market_type),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await market.save();

    logger.info(`MARKET CREATED: ${market.id}`);
};
