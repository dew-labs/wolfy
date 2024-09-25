import {
    createSatoruContract,
    DataStoreABI,
    ExchangeRouterABI,
    executeAndWait,
    SatoruContract,
    toStarknetHexString,
    type StarknetChainId,
} from "satoru-sdk";
import type { Account, Call, SuccessfulTransactionReceiptResponse } from "starknet";

// TODO: uss contracts/getters.ts instead
export function getDataStoreContract(chainId: StarknetChainId, connectTo?: Account) {
    return createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI, connectTo);
}

// TODO: uss contracts/getters.ts instead
export function getExchangeRouterContract(chainId: StarknetChainId, connectTo?: Account) {
    return createSatoruContract(
        chainId,
        SatoruContract.ExchangeRouter,
        ExchangeRouterABI,
        connectTo
    );
}

export async function askOrLatestMarketToken(
    ask: (question: string) => Promise<string>,
    chainId: StarknetChainId
) {
    let marketToken = await ask("Enter market token (default to last market)");

    const dataStoreContract = getDataStoreContract(chainId);

    if (!marketToken) {
        const marketCount = BigInt(await dataStoreContract.get_market_count());
        if (marketCount === 0n) throw new Error("No market available");
        const lastMarket = (
            await dataStoreContract.get_market_keys(marketCount - 1n, marketCount)
        )[0];
        if (!lastMarket) throw new Error("Invalid market");
        marketToken = toStarknetHexString(lastMarket);
        console.log("Market:", marketToken);
    }

    return marketToken;
}

export async function executeAndGetResult(
    account: Account,
    call: Call | Call[],
    onSuccess: (successReceipt: SuccessfulTransactionReceiptResponse) => void,
    failMessage = "Failed"
) {
    const receipt = await executeAndWait(account, call);

    if (receipt.isSuccess()) {
        onSuccess(receipt);
    } else {
        throw new Error(failMessage);
    }
}
