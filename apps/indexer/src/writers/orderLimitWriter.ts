import { cairoIntToBigInt, parseOrderType, toStarknetHexString } from "satoru-sdk";
import { validateAndParseAddress } from "starknet";

import {
    ContractMarket,
    createLogger,
    getDataStoreContract,
    getMarket,
    getNetworkConfig,
    getTokens,
} from "@freyr/shared/utils";
import { starknet } from "@snapshot-labs/checkpoint";

import { Order } from "../../.checkpoint/models";

const logger = createLogger("OrderLimitWriter");
const tokens = getTokens();

export const handleOrderCreated: starknet.Writer = async ({ block, tx, rawEvent, event }) => {
    if (!block || !event || !rawEvent) return;

    const author = validateAndParseAddress(rawEvent.from_address);
    const {
        key,
        order_type,
        market: marketAddress,
        trigger_price,
        acceptable_price,
        is_long,
    } = event.order;

    const order = new Order(toStarknetHexString(key));
    const { chainId, account } = getNetworkConfig();
    const dataStoreContract = getDataStoreContract(chainId, account);

    const market: ContractMarket = await getMarket(dataStoreContract, marketAddress);
    const indexTokenAddress = toStarknetHexString(market.index_token);
    const indexToken = tokens.find((token) => token.address === indexTokenAddress);

    if (!indexToken) {
        logger.error(`Index token not found for address: ${indexTokenAddress}`);
        return;
    }

    Object.assign(order, {
        author,
        key: toStarknetHexString(key),
        market: toStarknetHexString(marketAddress),
        order_type: parseOrderType(order_type),
        is_long,
        index_token_address: indexTokenAddress,
        index_token_decimals: indexToken.decimals,
        trigger_price: String(cairoIntToBigInt(trigger_price)),
        acceptable_price: String(cairoIntToBigInt(acceptable_price)),
        tx_hash: tx.transaction_hash,
        created_at: block.timestamp,
        created_at_block: block.block_number,
    });

    await order.save();

    logger.info(`Order created: ${order.id}`);
};
