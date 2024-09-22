import { createCall } from "satoru-sdk";

import {
    createSatoruContract,
    createTokenContract,
    executeAndWait,
    MarketFactoryABI,
    SatoruContract,
} from "satoru-sdk";
import { CairoUint256, type Account } from "starknet";

export default async function createMarket(
    account: Account,
    indexTokenAddress: string,
    longTokenAddress: string,
    shortTokenAddress: string
) {
    const chainId = await account.getChainId();

    const marketFactoryContract = createSatoruContract(
        chainId,
        SatoruContract.MarketFactory,
        MarketFactoryABI,
        account
    );

    const longTokenContract = createTokenContract(chainId, longTokenAddress);
    const shortTokenContract = createTokenContract(chainId, shortTokenAddress);

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

    await executeAndWait(account, [
        // BEGIN Fill the pool, this is the initial amount that depositors will put in the pool
        // Mint long token to the market
        createCall(longTokenContract, "mint", [
            marketTokenAddress,
            new CairoUint256(50000000000000000000000000000000000000),
        ]),
        // Mint short token to the market
        createCall(shortTokenContract, "mint", [
            marketTokenAddress,
            new CairoUint256(25000000000000000000000000000000000000000),
        ]),
        // END Fill the pool
    ]);

    console.log("All mint done.");

    return marketTokenAddress;
}
