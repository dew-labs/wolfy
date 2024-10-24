import { Deposit } from "apps/indexer/.checkpoint/models";
import { createLogger } from "@freyr/shared/utils";
import { cairoIntToBigInt, OrderType, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";

import type { SatoruEvent } from "satoru-sdk";
import { getTradeHistoryAction } from "../utils";
import { TradeHistoryEvent } from "@freyr/shared/interfaces";

const logger = createLogger("DepositCreatedWriter");

export const handleDepositCreated: SatoruEventWriter<SatoruEvent.DepositCreated> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    const deposit = new Deposit(toStarknetHexString(event.key));

    Object.assign(deposit, {
        key: toStarknetHexString(event.key),
        account: toStarknetHexString(event.account),
        receiver: toStarknetHexString(event.receiver),
        market: toStarknetHexString(event.market),
        action: getTradeHistoryAction(TradeHistoryEvent.DepositCreated, OrderType.MarketIncrease),
        long_token: toStarknetHexString(event.initial_long_token),
        short_token: toStarknetHexString(event.initial_short_token),
        long_token_amount: cairoIntToBigInt(event.initial_long_token_amount),
        short_token_amount: cairoIntToBigInt(event.initial_short_token_amount),
        long_token_swap_path: event.long_token_swap_path.snapshot.map(toStarknetHexString),
        short_token_swap_path: event.short_token_swap_path.snapshot.map(toStarknetHexString),
        min_market_tokens: cairoIntToBigInt(event.min_market_tokens),
        execution_fee: cairoIntToBigInt(event.execution_fee),
        callback_contract: toStarknetHexString(event.callback_contract),
        callback_gas_limit: cairoIntToBigInt(event.callback_gas_limit),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await deposit.save();

    logger.info(`DEPOSIT CREATED: ${deposit.id}`);
};
