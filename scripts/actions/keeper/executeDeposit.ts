import {
    executeAndWait,
    getCompiledSierra,
    getContracts,
    newContract,
    settingUp,
} from "../../utils";
import readline from "readline";

async function deploy() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // Get deposit key from DataStore.get_deposit_keys
    rl.question("Enter deposit key: ", async (depositKey) => {
        const { account } = await settingUp();
        const contracts = getContracts();

        const depositHandlerContract = newContract(
            getCompiledSierra("DepositHandler").abi,
            contracts.DEPOSIT_HANDLER,
            account
        );

        const setPricesParams = {
            signer_info: 0,
            tokens: [contracts.zETH, contracts.USDC],
            compacted_min_oracle_block_numbers: [63970, 63970],
            compacted_max_oracle_block_numbers: [100000, 100000],
            compacted_oracle_timestamps: [171119803, 10],
            compacted_decimals: [1, 1],
            compacted_min_prices: [2147483648010000], // 500000, 10000 compacted
            compacted_min_prices_indexes: [0],
            compacted_max_prices: [4000, 1], // 500000, 10000 compacted
            compacted_max_prices_indexes: [0],
            signatures: [
                ["signatures1", "signatures2"],
                ["signatures1", "signatures2"],
            ],
            price_feed_tokens: [],
        };

        const executeDepositReceipt = await executeAndWait(
            depositHandlerContract.populate("execute_deposit", [depositKey, setPricesParams]),
            account
        );

        if (executeDepositReceipt.isSuccess()) {
            console.log("Deposit executed");
        } else {
            console.log("Deposit execution failed");
        }

        rl.close();
    });

    rl.prompt();
}

deploy();
