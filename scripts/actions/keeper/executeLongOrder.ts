import { ask, doneAsking, settingUp } from "../../utils";
import DataStoreABI from "../../../artifacts/DataStoreABI";
import OrderHandlerABI from "../../../artifacts/OrderHandlerABI";
import { createCall, createSatoruContract, executeAndWait, SatoruContract } from "satoru-sdk";

async function create_market() {
    // get order key from DataStore.get_account_order_keys
    const longOrderKey = await ask("Enter long order key");

    if (!longOrderKey) throw new Error("Invalid long order key");

    const { account, chainId } = await settingUp();

    const dataStoreContract = createSatoruContract(
        chainId,
        SatoruContract.DataStore,
        DataStoreABI,
        account
    );

    const order = await dataStoreContract.get_order(longOrderKey);
    const marketTokenAddress = order.market;
    const collateralTokenAddress = order.initial_collateral_token;

    await executeAndWait(
        chainId,
        [
            createCall(dataStoreContract, "set_u256", [
                await dataStoreContract.get_open_interest_key(
                    marketTokenAddress,
                    collateralTokenAddress,
                    true
                ),
                1,
            ]),
            createCall(dataStoreContract, "set_u256", [
                await dataStoreContract.get_max_open_interest_key(marketTokenAddress, true),
                1000000000000000000000000000000000000000000000000000,
            ]),
        ],
        account
    );

    const setPricesParams = {
        signer_info: 1,
        tokens: [zEthAddress, usdcAddress],
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
        chainId,
        createCall(orderHandlerContract, "execute_order", [longOrderKey, setPricesParams]),
        account
    );

    if (executeOrderReceipt.isSuccess()) {
        console.log("Order executed");
    } else {
        throw new Error("Order execution failed");
    }

    doneAsking();
}

create_market();
