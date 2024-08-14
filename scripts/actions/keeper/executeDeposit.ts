import {
    createCall,
    createSatoruContract,
    DataStoreABI,
    DepositHandlerABI,
    executeAndWait,
    SatoruContract,
} from "satoru-sdk";
import { settingUp, ask, doneAsking } from "../../utils";

async function executeDeposit() {
    // Get deposit key from DataStore.get_deposit_keys
    const depositKey = await ask("Enter deposit key");

    if (!depositKey) throw new Error("Invalid deposit key");

    const { account, chainId } = await settingUp();

    const dataStoreContract = createSatoruContract(
        chainId,
        SatoruContract.DataStore,
        DataStoreABI,
        account
    );
    const deposit = await dataStoreContract.get_deposit(depositKey);

    const longToken = deposit.initial_long_token;
    const shortToken = deposit.initial_short_token;

    const depositHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.DepositHandler,
        DepositHandlerABI,
        account
    );

    const setPricesParams = {
        signer_info: 1,
        tokens: [longToken, shortToken],
        compacted_min_oracle_block_numbers: [63970, 63970],
        compacted_max_oracle_block_numbers: [1000000, 1000000],
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
        chainId,
        createCall(depositHandlerContract, "execute_deposit", [depositKey, setPricesParams]),
        account
    );

    if (executeDepositReceipt.isSuccess()) {
        console.log("Deposit executed");
    } else {
        throw new Error("Deposit execution failed");
    }

    doneAsking();
}

executeDeposit();
