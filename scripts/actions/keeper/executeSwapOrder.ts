import {
    createCall,
    createSatoruContract,
    executeAndWait,
    OrderHandlerABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { createAsker, settingUp } from "shared/utils/utils";
import { getDataStoreContract } from "shared/utils/helpers";

async function executeSwapOrder() {
    // get order key from DataStore.get_account_order_keys
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    let orderKey = await ask("Enter order key (default to lastest order");

    if (!orderKey) {
        const orderCount = BigInt(await dataStoreContract.get_order_count());
        if (orderCount === 0n) throw new Error("No order available");

        const lastOrder = (await dataStoreContract.get_order_keys(orderCount - 1n, orderCount))[0];
        if (!lastOrder) throw new Error("Invalid order");

        orderKey = toStarknetHexString(lastOrder);
        console.log("Order:", orderKey);
    }

    const order = await dataStoreContract.get_order(orderKey);
    const market = await dataStoreContract.get_market(order.market);

    const longTokenAddress = market.long_token;
    const shortTokenAddress = market.short_token;

    const orderHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.OrderHandler,
        OrderHandlerABI,
        account
    );

    const setPricesParams = {
        signer_info: 1,
        tokens: [longTokenAddress, shortTokenAddress],
        compacted_min_oracle_block_numbers: [63970, 63970],
        compacted_max_oracle_block_numbers: [1000000, 1000000],
        compacted_oracle_timestamps: [171119803, 10],
        compacted_decimals: [1, 1],
        compacted_min_prices: [2147483648010000], // 500000, 10000 compacted
        compacted_min_prices_indexes: [0],
        compacted_max_prices: [2147483648010000], // 500000, 10000 compacted
        compacted_max_prices_indexes: [0],
        signatures: [
            ["signatures1", "signatures2"],
            ["signatures1", "signatures2"],
        ],
        price_feed_tokens: [],
    };

    const executeOrderReceipt = await executeAndWait(
        account,
        createCall(orderHandlerContract, "execute_order_keeper", [
            orderKey,
            setPricesParams,
            account.address,
        ])
    );

    if (executeOrderReceipt.isSuccess()) {
        console.log("Swap order executed");
    } else {
        throw new Error("Swap order execution failed");
    }

    doneAsking();
}

executeSwapOrder();
