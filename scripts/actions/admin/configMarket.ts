import { createAsker, settingUp } from "@/shared/utils/utils";

import {
    createSatoruContract,
    DataStoreABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import configMarket from "./utils/configMarket";

async function promptConfigMarket() {
    const { account, chainId } = await settingUp();

    const dataStoreContract = createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI);

    const { ask, doneAsking } = createAsker();

    let marketToken = await ask("Enter market token (default to last market)");

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

    const marketName = await ask("Enter market name (eg: ETH/USD)");
    const maxLongTokenPoolAmount = Number(await ask("Enter max long token pool amount"));
    const maxShortTokenPoolAmount = Number(await ask("Enter max short token pool amount"));

    await configMarket(
        chainId,
        account,
        marketName,
        marketToken,
        maxLongTokenPoolAmount,
        maxShortTokenPoolAmount
    );

    doneAsking();
}

promptConfigMarket();
