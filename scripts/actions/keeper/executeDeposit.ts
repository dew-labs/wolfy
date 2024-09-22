import {
    createCall,
    createSatoruContract,
    DepositHandlerABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { createAsker, expandDecimals, getSetPriceParams, settingUp } from "@/shared/utils/utils";
import { executeAndGetResult, getDataStoreContract } from "@/shared/utils/helpers";
import { USD_DECIMALS } from "@/shared/utils/config";
import { createTokenContract } from "satoru-sdk";

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

    const longToken = toStarknetHexString(deposit.initial_long_token);
    const shortToken = toStarknetHexString(deposit.initial_short_token);

    const longTokenContract = createTokenContract(chainId, longToken);
    const longTokenDecimals = await longTokenContract.decimals();

    const shortTokenContract = createTokenContract(chainId, shortToken);
    const shortTokenDecimals = await shortTokenContract.decimals();

    const depositHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.DepositHandler,
        DepositHandlerABI,
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
        createCall(depositHandlerContract, "execute_deposit", [depositKey, setPricesParams]),
        () => {
            console.log("Deposit executed");
        },
        "Deposit execution failed"
    );

    doneAsking();
}

executeDeposit();
