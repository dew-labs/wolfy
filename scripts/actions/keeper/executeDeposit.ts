import {
    createCall,
    createSatoruContract,
    DepositHandlerABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { createAsker, settingUp } from "../../utils";
import { executeAndGetResult, getDataStoreContract } from "../../helpers";

async function executeDeposit() {
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    // Get deposit key from DataStore.get_deposit_keys
    let depositKey = await ask("Enter deposit key (default to latest deposit)");

    if (!depositKey) {
        const depositCount = BigInt(await dataStoreContract.get_deposit_count());
        if (depositCount === 0n) throw new Error("No deposit available");
        const lastDeposit = (
            await dataStoreContract.get_deposit_keys(depositCount - 1n, depositCount)
        )[0];
        if (!lastDeposit) throw new Error("Invalid deposit");
        depositKey = toStarknetHexString(lastDeposit);
        console.log("Deposit key:", depositKey);
    }

    const deposit = await dataStoreContract.get_deposit(depositKey);

    const longToken = deposit.initial_long_token;
    const shortToken = deposit.initial_short_token;

    const depositHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.DepositHandler,
        DepositHandlerABI,
        account
    );

    const currentBlock = await account.getBlock();
    const minBlock = 0;

    const setPricesParams = {
        signer_info: 0,
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

    await executeAndGetResult(
        account,
        createCall(depositHandlerContract, "execute_deposit", [depositKey, setPricesParams]),
        () => {
            console.log("Deposit executed");
        },
        "Deposit execution failed"
    );

    doneAsking();
}

executeDeposit();
