import {
    cairoIntToBigInt,
    createCall,
    createSatoruContract,
    executeAndWait,
    OrderHandlerABI,
    OrderType,
    parseOrderType,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { createAsker, expandDecimals, settingUp } from "../../utils";
import { getDataStoreContract } from "../../helpers";

async function executeOrder() {
    // get order key from DataStore.get_account_order_keys
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    let orderKey = await ask("Enter order key (default to lastest order)");

    if (!orderKey) {
        const orderCount = BigInt(await dataStoreContract.get_order_count());
        if (orderCount === 0n) throw new Error("No order available");

        const lastOrder = (await dataStoreContract.get_order_keys(orderCount - 1n, orderCount))[0];
        if (!lastOrder) throw new Error("Invalid order");

        orderKey = toStarknetHexString(lastOrder);
        console.log("Order:", orderKey);
    }

    const order = await dataStoreContract.get_order(orderKey);

    console.log("Execution fee:", order.execution_fee);
    // TODO: shouldn't execute the order if fee is lowwer than configured

    const market = await dataStoreContract.get_market(order.market);

    const orderType = parseOrderType(order.order_type);
    const longOrShort = order.is_long ? "Long" : "Short";
    console.log("Order type:", longOrShort, orderType);

    let executionPriceForLongToken = BigInt(
        await ask("Execution price for long token (usd)(default to trigger price for limit)")
    );

    if (!executionPriceForLongToken) {
        if (
            [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(
                orderType
            )
        ) {
            throw new Error("Market order must have a execution price");
        }
        executionPriceForLongToken = cairoIntToBigInt(order.trigger_price);
        console.log("Execute at", order.trigger_price);
    } else {
        executionPriceForLongToken = expandDecimals(executionPriceForLongToken, 18);
    }

    let executionPriceForShortToken = BigInt(
        await ask("Execution price for short token (usd)(default to 1)")
    );

    if (!executionPriceForShortToken) {
        executionPriceForShortToken = expandDecimals(1, 18);
    } else {
        executionPriceForShortToken = expandDecimals(executionPriceForShortToken, 18);
    }

    const longTokenAddress = market.long_token;
    const shortTokenAddress = market.short_token;

    const currentBlockNum = await account.getBlockNumber();
    const currentBlock = await account.getBlock();

    const block0 = 0;
    const block1 = currentBlockNum;

    const setPricesParams = {
        signer_info: 1,
        tokens: [longTokenAddress, shortTokenAddress],
        compacted_min_oracle_block_numbers: [block0, block0],
        compacted_max_oracle_block_numbers: [block1, block1],
        compacted_oracle_timestamps: [currentBlock.timestamp, currentBlock.timestamp], // not in use
        compacted_decimals: [0, 0], // decimals of the price, not in use
        compacted_min_prices_indexes: [0], // not in use
        compacted_max_prices_indexes: [0], // not in use
        compacted_min_prices: [2147483648010000], // doesn't matter
        compacted_max_prices: [executionPriceForLongToken, executionPriceForShortToken], // this is the price where order executed
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
        console.log("Order executed");
    } else {
        throw new Error("Order execution failed");
    }

    doneAsking();
}

executeOrder();
