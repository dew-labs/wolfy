import { Contract } from "starknet";
import { getCompiledSierra, getContracts, settingUp } from "../../utils";
import readline from "readline";

async function deploy() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // Get deposit key from DataStore.get_deposit_keys
    rl.question("Enter deposit key: ", async (depositKey) => {
        const { account } = await settingUp();
        const contracts = getContracts();

        const dataStoreContract = new Contract(
            getCompiledSierra("DataStore").abi,
            contracts.DATA_STORE as string,
            account
        );

        const dataCall5 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pool_amount_key(contracts.MARKET_TOKEN, contracts.zETH),
            2500000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx5 = await dataStoreContract.set_u256(dataCall5.calldata);
        await account.waitForTransaction(setAddressTx5.transaction_hash);

        const dataCall6 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pool_amount_key(contracts.MARKET_TOKEN, contracts.USDC),
            2500000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx6 = await dataStoreContract.set_u256(dataCall6.calldata);
        await account.waitForTransaction(setAddressTx6.transaction_hash);

        const depositHandlerContract = new Contract(
            getCompiledSierra("DepositHandler").abi,
            contracts.DEPOSIT_HANDLER,
            account
        );

        const setPricesParams = {
            signer_info: 1,
            tokens: [contracts.USDC, contracts.zETH],
            compacted_min_oracle_block_numbers: [63970, 63970],
            compacted_max_oracle_block_numbers: [100000, 10000],
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

        const executeOrderCall = depositHandlerContract.populate("execute_deposit", [
            depositKey,
            setPricesParams,
        ]);
        let tx = await depositHandlerContract.execute_deposit(executeOrderCall.calldata);

        rl.close();
    });

    rl.prompt();
}

deploy();
