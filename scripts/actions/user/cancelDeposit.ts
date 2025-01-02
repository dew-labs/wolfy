import {
    createAsker,
    getDataStoreContract,
    getExchangeRouterContract,
    settingUp,
} from "@freyr/shared/utils";
import { createCall, executeAndWait, toStarknetHexString } from "wolfy-sdk";

async function cancelDeposit() {
    // get order key from DataStore.get_account_order_keys
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    let depositKey = await ask("Enter deposit key (default to lastest deposit");

    if (!depositKey) {
        const depositCount = BigInt(await dataStoreContract.get_deposit_count());
        if (depositCount === 0n) throw new Error("No deposit available");

        const lastDeposit = (
            await dataStoreContract.get_deposit_keys(depositCount - 1n, depositCount)
        )[0];
        if (!lastDeposit) throw new Error("Invalid deposit");

        depositKey = toStarknetHexString(lastDeposit);
        console.log("Deposit:", depositKey);
    }

    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    const executeDepositReceipt = await executeAndWait(
        account,
        createCall(exchangeRouterContract, "cancel_deposit", [depositKey])
    );

    if (executeDepositReceipt.isSuccess()) {
        console.log("Deposit cancelled");
    } else {
        throw new Error("Deposit cancellation failed");
    }

    doneAsking();
}

cancelDeposit();
