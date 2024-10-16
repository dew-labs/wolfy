import { cairoIntToBigInt, OrderType, parseOrderType, toStarknetHexString } from "satoru-sdk";

import {
    type ContractMarket,
    createLogger,
    getDataStoreContract,
    getMarket,
    getNetworkConfig,
} from "@freyr/shared/utils";
import { starknet } from "@snapshot-labs/checkpoint";

import { Order } from "../../.checkpoint/models";
import { Action } from "@freyr/shared/interfaces";

const logger = createLogger("OrderWriter");

export const handleOrderCreated: starknet.Writer = async ({ block, tx, rawEvent, event }) => {
    if (!block || !event || !rawEvent) return;

    const {
        key,
        account: accountAddress,
        order_type,
        market: marketAddress,
        size_delta_usd,
        trigger_price,
        acceptable_price,
        is_long,
    } = event.order;

    const orderKey = toStarknetHexString(key);
    const order = new Order(orderKey);
    const { chainId, account } = getNetworkConfig();
    const dataStoreContract = getDataStoreContract(chainId, account);

    const market: ContractMarket = await getMarket(dataStoreContract, marketAddress);

    const orderType = parseOrderType(order_type)

    Object.assign(order, {
        account: toStarknetHexString(accountAddress),
        action: getOrderAction(orderType, false),
        key: orderKey,
        market: toStarknetHexString(marketAddress),
        order_type: orderType,
        is_long,
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

export const handleOrderExecuted: starknet.Writer = async ({ block, tx, rawEvent, event }) => {
    if (!block || !event || !rawEvent) return;

    const key = toStarknetHexString(event.key);

    const order = await Order.loadEntity(key);
    if (!order) {
        logger.error(`Order not found for key: ${key}`);
        return;
    }

    order.is_executed = true;
    order.tx_hash = tx.transaction_hash;
    order.action = getOrderAction(order.order_type as OrderType, true);

    await order.save();

    logger.info(`Order executed: ${order.id}`);
};


const getOrderAction = (orderType: OrderType, isExecuted: boolean): Action => {
    switch (orderType) {
        case OrderType.MarketIncrease:
            return isExecuted ? Action.MarketIncrease : Action.RequestMarketIncrease;
        case OrderType.MarketDecrease:
            return isExecuted ? Action.MarketDecrease : Action.RequestMarketDecrease;
        case OrderType.Liquidation:
            return Action.Liquidation;
        default:
            // TODO: Update later for other actions
            return Action.None;
    }
}
