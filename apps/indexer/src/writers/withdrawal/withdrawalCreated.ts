import { TradeHistory } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { cairoIntToBigInt, OrderType, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { ParsedSatoruEvent, SatoruEvent } from "satoru-sdk";
import type { FullBlock, Transaction } from "@snapshot-labs/checkpoint/dist/src/providers/starknet";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("WithdrawalCreatedWriter");

export const handleWithdrawalCreated: SatoruEventWriter<SatoruEvent.WithdrawalCreated> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    await saveOrRemovePosition(event, tx, block);
};

const saveOrRemovePosition = async (
    event: ParsedSatoruEvent<SatoruEvent.WithdrawalCreated>,
    tx: Transaction,
    block: FullBlock
) => {
    await saveTradeHistory(event, tx, block);
};

const saveTradeHistory = async (
    event: ParsedSatoruEvent<SatoruEvent.WithdrawalCreated>,
    tx: Transaction,
    block: FullBlock
) => {
    const { key, account, market, market_token_amount } = event;

    const tradeHistory = new TradeHistory(toStarknetHexString(key));

    Object.assign(tradeHistory, {
        account: toStarknetHexString(account),
        key: toStarknetHexString(key),
        action: getTradeHistoryAction(
            TradeHistoryEvent.WithdrawalCreated,
            OrderType.MarketDecrease
        ),
        market: toStarknetHexString(market),
        is_long: false,
        pool_market_token_amount: cairoIntToBigInt(market_token_amount),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await tradeHistory.save();

    logger.info(`Trade history created: ${tradeHistory.id}`);
};
