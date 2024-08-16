import {
    createCall,
    createSatoruContract,
    DepositHandlerABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { createAsker, settingUp } from "../../utils";
import { executeAndGetResult, getDataStoreContract } from "../../helpers";
import { CairoUint256 } from "starknet";

export const MAX_UINT8 = "255"; // 2^8 - 1
export const MAX_UINT32 = "4294967295"; // 2^32 - 1
export const MAX_UINT64 = "18446744073709551615"; // 2^64 - 1

function getCompactedValues({
    values,
    compactedValueBitLength,
    maxValue,
}: {
    values: number[];
    compactedValueBitLength: number;
    maxValue: string;
}) {
    const compactedValuesPerSlot = 256 / compactedValueBitLength;
    const compactedValues = [];
    let shouldExit = false;

    for (let i = 0; i < (values.length - 1) / compactedValuesPerSlot + 1; i++) {
        let valueBits = 0n;
        for (let j = 0; j < compactedValuesPerSlot; j++) {
            const index = i * compactedValuesPerSlot + j;
            if (index >= values.length) {
                shouldExit = true;
                break;
            }

            const value = BigInt(values[index].toString());

            if (value > BigInt(maxValue)) {
                throw new Error(`Max value exceeded: ${value.toString()}`);
            }

            valueBits = valueBits | (value << BigInt(j * compactedValueBitLength));
        }

        compactedValues.push(valueBits.toString());

        if (shouldExit) {
            break;
        }
    }

    return compactedValues;
}

export function getCompactedDecimals(decimals: number[]) {
    return getCompactedValues({
        values: decimals,
        compactedValueBitLength: 8,
        maxValue: MAX_UINT8,
    });
}

export function getCompactedPrices(prices: number[]) {
    return getCompactedValues({
        values: prices,
        compactedValueBitLength: 32,
        maxValue: MAX_UINT32,
    });
}

export function getCompactedPriceIndexes(priceIndexes: number[]) {
    return getCompactedValues({
        values: priceIndexes,
        compactedValueBitLength: 8,
        maxValue: MAX_UINT8,
    });
}

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

    const currentBlockNum = await account.getBlockNumber();
    const currentBlock = await account.getBlock();

    const block0 = 0;
    const block1 = currentBlockNum;
    const min_prices = [500000, 10000];
    const max_prices = [500000, 10000];
    const compacted_decimals = getCompactedDecimals([1, 2]).map((elm) => new CairoUint256(elm));
    const compacted_min_prices = getCompactedPrices(min_prices).map((elm) => new CairoUint256(elm));
    const compacted_min_prices_indexes = getCompactedPriceIndexes([0, 0]).map(
        (elm) => new CairoUint256(elm)
    );
    const compacted_max_prices = getCompactedPrices(max_prices).map((elm) => new CairoUint256(elm));
    const compacted_max_prices_indexes = getCompactedPriceIndexes([0]).map(
        (elm) => new CairoUint256(elm)
    );

    const setPricesParams = {
        signer_info: 0,
        tokens: [longToken, shortToken],
        compacted_min_oracle_block_numbers: [block0, block0],
        compacted_max_oracle_block_numbers: [block1, block1],
        compacted_oracle_timestamps: [currentBlock.timestamp, currentBlock.timestamp],
        compacted_decimals: compacted_decimals,
        compacted_min_prices: compacted_min_prices,
        compacted_min_prices_indexes: compacted_min_prices_indexes,
        compacted_max_prices: [4000, 1], // 500000, 10000 compacted
        compacted_max_prices_indexes: compacted_max_prices_indexes,
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
