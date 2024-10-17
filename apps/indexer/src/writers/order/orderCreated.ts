import { Order, TradeHistory } from "apps/indexer/.checkpoint/models";
import { TradeHistoryEvent } from "packages/shared/src/interfaces";
import {
    createLogger,
    getDataStoreContract,
    getMarket,
    getNetworkConfig,
    isLiquidationOrder,
    isMarketOrder,
} from "packages/shared/src/utils";
import { cairoIntToBigInt, parseOrderType, toStarknetHexString } from "satoru-sdk";

import { type SatoruEventWriter } from "../type";
import { getTradeHistoryAction } from "../utils";

import type { ContractMarket } from "packages/shared/src/utils";

import type { ParsedSatoruEvent, SatoruEvent } from "satoru-sdk";
import type { FullBlock, Transaction } from "@snapshot-labs/checkpoint/dist/src/providers/starknet";

const logger = createLogger("OrderCreatedWriter");

export const handleOrderCreated: SatoruEventWriter<SatoruEvent.OrderCreated> = async ({
    block,
    tx,
    rawEvent,
    event,
}) => {
    if (!block || !event || !rawEvent) return;

    await Promise.all([saveOrder(event, tx, block), saveTradeHistory(event, tx, block)]);
};

const saveOrder = async (
    event: ParsedSatoruEvent<SatoruEvent.OrderCreated>,
    tx: Transaction,
    block: FullBlock
) => {
    const {
        key,
        account: accountAddress,
        order_type,
        market: marketAddress,
        initial_collateral_token,
        is_long,
        size_delta_usd,
        trigger_price,
        acceptable_price,
    } = event.order;

    const orderType = parseOrderType(order_type);

    // Not save order if it's a market order or liquidation order
    if (isMarketOrder(orderType) || isLiquidationOrder(orderType)) {
        return;
    }

    const orderKey = toStarknetHexString(key);
    const order = new Order(orderKey);
    const { chainId, account } = getNetworkConfig();
    const dataStoreContract = getDataStoreContract(chainId, account);

    const market: ContractMarket = await getMarket(dataStoreContract, marketAddress);

    Object.assign(order, {
        account: toStarknetHexString(accountAddress),
        action: getTradeHistoryAction(TradeHistoryEvent.OrderCreated, orderType),
        key: orderKey,
        market: toStarknetHexString(marketAddress),
        order_type: orderType,
        is_long,
        initial_collateral_token,
        index_token_address: toStarknetHexString(market.index_token),
        size_delta_usd: cairoIntToBigInt(size_delta_usd),
        trigger_price: cairoIntToBigInt(trigger_price),
        acceptable_price: cairoIntToBigInt(acceptable_price),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await order.save();

    logger.info(`Order created: ${order.id}`);
};

const saveTradeHistory = async (
    event: ParsedSatoruEvent<SatoruEvent.OrderCreated>,
    tx: Transaction,
    block: FullBlock
) => {
    const { key, account, order_type, market, is_long, size_delta_usd, trigger_price } =
        event.order;

    const orderType = parseOrderType(order_type);

    // Not save trade history if it's a liquidation order, save it when order is executed
    if (isLiquidationOrder(orderType)) {
        return;
    }

    const tradeHistory = new TradeHistory(toStarknetHexString(key));

    Object.assign(tradeHistory, {
        account: toStarknetHexString(account),
        key: toStarknetHexString(key),
        action: getTradeHistoryAction(TradeHistoryEvent.OrderCreated, orderType),
        market: toStarknetHexString(market),
        is_long,
        order_size_usd: cairoIntToBigInt(size_delta_usd),
        order_price: cairoIntToBigInt(trigger_price),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await tradeHistory.save();

    logger.info(`Trade history created: ${tradeHistory.id}`);
};
