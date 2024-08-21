import {
    cairoIntToBigInt,
    createCall,
    createSatoruContract,
    createTokenContract,
    executeAndWait,
    getProvider,
    OrderHandlerABI,
    OrderType,
    parseOrderType,
    ProviderType,
    SatoruContract,
    SatoruEvent,
    SatoruEventHandler,
    SatoruWebSocketProvider,
    StarknetChainId,
    toStarknetHexString,
} from "satoru-sdk";

import setup from "../scripts/setup";
import { expandDecimals, settingUp } from "../scripts/utils";
import { getDataStoreContract } from "../scripts/helpers";
import { Account } from "starknet";
import { USD_DECIMALS } from "../scripts/config";

async function createOrderListener() {
    setup();

    const { account, chainId } = await settingUp();
    const wssProvider: SatoruWebSocketProvider = getProvider(ProviderType.WSS, chainId);

    const eventHandler: SatoruEventHandler<SatoruEvent.OrderCreated> = (event) => {
        const orderData = event["satoru::event::event_emitter::EventEmitter::OrderCreated"].order;
        executeOrder(account, chainId, orderData);
    };

    await wssProvider.subscribeToEvent(SatoruEvent.OrderCreated, eventHandler);
}

async function executeOrder(account: Account, chainId: StarknetChainId, orderData) {
    const dataStoreContract = getDataStoreContract(chainId, account);

    const orderKey = toStarknetHexString(orderData.key);

    // TODO: shouldn't execute the order if fee is lower than configured

    const orderType = parseOrderType(orderData.order_type);
    if (
        [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(
            orderType
        )
    ) {
        throw new Error("Market order must have a execution price");
    }
    const marketKey = toStarknetHexString(orderData.market);
    const market = await dataStoreContract.get_market(marketKey);
    const indexTokenAddress = toStarknetHexString(market.index_token);
    const indexToken = createTokenContract(chainId, indexTokenAddress);
    const indexTokenDecimals = await indexToken.decimals();

    const executionPrice =
        expandDecimals(orderData.trigger_price, USD_DECIMALS) /
        expandDecimals(1, indexTokenDecimals);

    const currentBlockNum = await account.getBlockNumber();
    const currentBlock = await account.getBlock();

    const block0 = 0;
    const block1 = currentBlockNum;

    const setPricesParams = {
        signer_info: 1,
        tokens: [indexTokenAddress],
        compacted_min_oracle_block_numbers: [block0, block0],
        compacted_max_oracle_block_numbers: [block1, block1],
        compacted_oracle_timestamps: [currentBlock.timestamp, currentBlock.timestamp], // not in use
        compacted_decimals: [0, 0], // decimals of the price, not in use
        compacted_min_prices_indexes: [0], // not in use
        compacted_max_prices_indexes: [0], // not in use
        compacted_min_prices: [2147483648010000], // doesn't matter
        compacted_max_prices: [executionPrice], // this is the price where order executed
        signatures: [
            ["signatures1", "signatures2"],
            ["signatures1", "signatures2"],
        ],
        price_feed_tokens: [],
    };

    const orderHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.OrderHandler,
        OrderHandlerABI,
        account
    );

    const executeOrderReceipt = await executeAndWait(
        account,
        createCall(orderHandlerContract, "execute_order", [orderKey, setPricesParams])
    );

    if (executeOrderReceipt.isSuccess()) {
        console.info("🚀 EXECUTE ORDER SUCCESSFULLY 🚀");
    } else {
        // TODO: retry here
    }
}

createOrderListener();
