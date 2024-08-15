import {
    createCall,
    createSatoruContract,
    DataStoreABI,
    executeAndWait,
    OrderHandlerABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { createAsker, decimalToFloat, settingUp } from "../../utils";

async function create_market() {
    // get order key from DataStore.get_account_order_keys
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = createSatoruContract(
        chainId,
        SatoruContract.DataStore,
        DataStoreABI,
        account
    );

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

    // await executeAndWait(account, [
    //     dataStoreContract.populate("set_u256", [
    //         await dataStoreContract.get_open_interest_key(
    //             marketTokenAddress,
    //             longTokenAddress,
    //             true
    //         ),
    //         1,
    //     ]),
    // ]);

    const setPricesParams = {
        signer_info: 1,
        tokens: [longTokenAddress, shortTokenAddress],
        compacted_min_oracle_block_numbers: [63970, 63970],
        compacted_max_oracle_block_numbers: [1000000, 1000000],
        compacted_oracle_timestamps: [171119803, 10],
        compacted_decimals: [1, 1],
        compacted_min_prices: [2147483648010000], // 500000, 10000 compacted
        compacted_min_prices_indexes: [0],
        compacted_max_prices: [3500, 1],
        compacted_max_prices_indexes: [0],
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

create_market();
