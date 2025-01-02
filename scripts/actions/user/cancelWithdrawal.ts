import {
    createAsker,
    getDataStoreContract,
    getExchangeRouterContract,
    settingUp,
} from "@freyr/shared/utils";
import { createCall, executeAndWait, toStarknetHexString } from "wolfy-sdk";

async function cancelWithdrawal() {
    // get order key from DataStore.get_account_order_keys
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    let withdrawalKey = await ask("Enter withdrawal key (default to lastest withdrawal");

    if (!withdrawalKey) {
        const withdrawalCount = BigInt(await dataStoreContract.get_withdrawal_count());
        if (withdrawalCount === 0n) throw new Error("No withdrawal available");

        const lastWithdrawal = (
            await dataStoreContract.get_withdrawal_keys(withdrawalCount - 1n, withdrawalCount)
        )[0];
        if (!lastWithdrawal) throw new Error("Invalid withdrawal");

        withdrawalKey = toStarknetHexString(lastWithdrawal);
        console.log("Withdrawal:", withdrawalKey);
    }

    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    const executeWithdrawalReceipt = await executeAndWait(
        account,
        createCall(exchangeRouterContract, "cancel_withdrawal", [withdrawalKey])
    );

    if (executeWithdrawalReceipt.isSuccess()) {
        console.log("Withdrawal cancelled");
    } else {
        throw new Error("Withdrawal cancellation failed");
    }

    doneAsking();
}

cancelWithdrawal();
