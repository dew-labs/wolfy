import { executeAndWait, getContracts, newContract, settingUp } from "../../utils";
import DataStoreABI from "../../../artifacts/DataStoreABI";
import readline from "readline";
import OrderHandlerABI from "../../../artifacts/OrderHandlerABI";

async function create_market() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // get order key from DataStore.get_account_order_keys
    rl.question("Enter long order key: ", async (longOrderKey) => {
        const { account } = await settingUp();
        const contracts = getContracts();

        const marketTokenAddress = contracts.MARKET_TOKEN;
        const zEthAddress = contracts.zETH;
        const usdcAddress = contracts.USDC;

        const dataStoreContract = newContract(DataStoreABI, contracts.DATA_STORE, account);

        await executeAndWait(
            [
                dataStoreContract.populate("set_u256", [
                    await dataStoreContract.get_open_interest_key(
                        marketTokenAddress,
                        zEthAddress,
                        true
                    ),
                    1,
                ]),
                dataStoreContract.populate("set_u256", [
                    await dataStoreContract.get_max_open_interest_key(marketTokenAddress, true),
                    1000000000000000000000000000000000000000000000000000,
                ]),
            ],
            account
        );

        const setPricesParams = {
            signer_info: true,
            tokens: [zEthAddress, usdcAddress],
            compacted_min_oracle_block_numbers: [63970, 63970],
            compacted_max_oracle_block_numbers: [64901, 64901],
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

        const orderHandlerContract = newContract(OrderHandlerABI, contracts.ORDER_HANDLER, account);

        const executeOrderReceipt = await executeAndWait(
            orderHandlerContract.populate("execute_order", [longOrderKey, setPricesParams]),
            account
        );

        if (executeOrderReceipt.isSuccess()) {
            console.log("Order executed");
        } else {
            console.log("Order execution failed");
        }

        rl.close();
    });

    rl.prompt();
}

create_market();
