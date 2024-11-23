import { createCall } from "wolfy-sdk";

import { createWolfyContract, executeAndWait, MarketFactoryABI, WolfyContract } from "wolfy-sdk";
import { CairoUint256, type Account } from "starknet";

export default async function createMarket(
    account: Account,
    indexTokenAddress: string,
    longTokenAddress: string,
    shortTokenAddress: string
) {
    const chainId = await account.getChainId();

    const marketFactoryContract = createWolfyContract(
        chainId,
        WolfyContract.MarketFactory,
        MarketFactoryABI,
        account
    );

    // BEGIN create market

    let marketTokenAddress;

    try {
        // create market
        const rec = await executeAndWait(
            account,
            createCall(marketFactoryContract, "create_market", [
                indexTokenAddress,
                longTokenAddress,
                shortTokenAddress,
                "market_type",
            ])
        );

        if (rec.isSuccess()) {
            marketTokenAddress = rec.events[0]?.data[1];
            console.log("MarketToken=" + marketTokenAddress);
        }
    } catch (error) {
        throw new Error("Market already settled or error occurred:", { cause: error });
    }

    if (!marketTokenAddress) throw new Error("Failed to create market");

    // END create market

    console.log("Created market.");

    return marketTokenAddress;
}
