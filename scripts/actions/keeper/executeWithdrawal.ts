import {
    createAsker,
    executeAndGetResult,
    expandDecimals,
    getDataStoreContract,
    getSetPriceParams,
    settingUp,
    USD_DECIMALS,
} from "@freyr/shared/utils";
import {
    createCall,
    createSatoruContract,
    createTokenContract,
    WithdrawalHandlerABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { shortString } from "starknet";

async function executeWithdrawal() {
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    // Get withdrawal key from DataStore.get_withdrawal_keys
    let withdrawalKey = await ask("Enter withdrawal key (default to latest withdrawal)");

    // TODO: can only works when this function available https://github.com/dew-labs/satoru/pull/8/files
    // if (!withdrawalKey) {
    //     const withdrawalCount = BigInt(await dataStoreContract.get_withdrawal_count());
    //     if (withdrawalCount === 0n) throw new Error("No withdrawal available");
    //     const lastWithdrawal = (
    //         await dataStoreContract.get_withdrawal_keys(withdrawalCount - 1n, withdrawalCount)
    //     )[0];
    //     if (!lastWithdrawal) throw new Error("Invalid withdrawal");
    //     withdrawalKey = toStarknetHexString(lastWithdrawal);
    //     console.log("Withdrawal key:", withdrawalKey);
    // }
    if (!withdrawalKey) {
        throw new Error("Withdrawal key is required");
    }

    const withdrawal = await dataStoreContract.get_withdrawal(withdrawalKey);

    const marketToken = toStarknetHexString(withdrawal.market);
    const market = await dataStoreContract.get_market(marketToken);
    const longToken = toStarknetHexString(market.long_token);
    const shortToken = toStarknetHexString(market.short_token);

    const longTokenContract = createTokenContract(chainId, longToken);
    const longTokenDecimals = await longTokenContract.decimals();

    const shortTokenContract = createTokenContract(chainId, shortToken);
    const shortTokenDecimals = await shortTokenContract.decimals();

    const longTokenSymbol = shortString.decodeShortString(String(await longTokenContract.symbol()));
    const shortTokenSymbol = shortString.decodeShortString(
        String(await shortTokenContract.symbol())
    );

    console.log(`Market: ${longTokenSymbol}/${shortTokenSymbol}`);

    const withdrawalHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.WithdrawalHandler,
        WithdrawalHandlerABI,
        account
    );

    const longTokenPriceReadable = (await ask("Long token price (usd) (default to 3500)")) || 3500;
    const shortTokenPriceReadable = (await ask("Short token price (usd) (default to 1)")) || 1;

    const longTokenPrice =
        expandDecimals(longTokenPriceReadable, USD_DECIMALS) / expandDecimals(1, longTokenDecimals);

    const shortTokenPrice =
        expandDecimals(shortTokenPriceReadable, USD_DECIMALS) /
        expandDecimals(1, shortTokenDecimals);

    const setPricesParams = await getSetPriceParams(account, [
        [longToken, longTokenPrice],
        [shortToken, shortTokenPrice],
    ]);

    await executeAndGetResult(
        account,
        createCall(withdrawalHandlerContract, "execute_withdrawal", [
            withdrawalKey,
            setPricesParams,
        ]),
        () => {
            console.log("Withdrawal executed");
        },
        "Withdrawal execution failed"
    );

    doneAsking();
}

executeWithdrawal();
