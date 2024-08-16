import {
    createCall,
    createSatoruContract,
    executeAndWait,
    OrderHandlerABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { createAsker, settingUp } from "../../utils";
import { getDataStoreContract, getExchangeRouterContract } from "../../helpers";

async function cancelOrder() {
    // get order key from DataStore.get_account_order_keys
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    let orderKey = await ask("Enter order key (default to lastest order");

    if (!orderKey) {
        const orderCount = BigInt(await dataStoreContract.get_order_count());
        if (orderCount === 0n) throw new Error("No order available");

        const lastOrder = (await dataStoreContract.get_order_keys(orderCount - 1n, orderCount))[0];
        if (!lastOrder) throw new Error("Invalid order");

        orderKey = toStarknetHexString(lastOrder);
        console.log("Order:", orderKey);
    }

    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    const executeOrderReceipt = await executeAndWait(
        account,
        createCall(exchangeRouterContract, "cancel_order", [orderKey])
    );

    if (executeOrderReceipt.isSuccess()) {
        console.log("Order cancelled");
    } else {
        throw new Error("Order cancellation failed");
    }

    doneAsking();
}

cancelOrder();
