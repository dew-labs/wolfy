import {
    cairoIntToBigInt,
    createSatoruContract,
    getProvider,
    OrderHandlerABI,
    OrderType,
    parseOrderType,
    ProviderType,
    SatoruContract,
    type SatoruContractAbi,
    SatoruEvent,
    type SatoruEventHandler,
    type SatoruWebSocketProvider,
    toStarknetHexString,
} from "satoru-sdk";

import { Account, type TypedContractV2 } from "starknet";
import { parseWithBigInt, readJsonFile, settingUp } from "./utils";
import { getDataStoreContract } from "./helpers";
import { EXECUTION_ORDER_METHOD } from "./config";
import pc from "picocolors";
import setup from "./setup";
import { HermesClient } from "@pythnetwork/hermes-client";
import type { IPriceFeed } from "./interface/priceFeed";
import type { IOrdersMap } from "./interface/order";
import type { IToken } from "./interface/token";

async function runOrderKeeper(): Promise<void> {
    setup();

    const { net, account, chainId, hermesUrl } = await settingUp();

    const connection = new HermesClient(hermesUrl, {});

    // get price ids
    let tokens: IToken[] = await readJsonFile(`./tokens.${net}.json`);
    if (!Array.isArray(tokens)) tokens = [];

    const priceIds = tokens.map((token) => token.pythPriceId);

    // Streaming price updates
    const eventSource = await connection.getPriceUpdatesStream(priceIds, {
        encoding: "hex",
        parsed: true,
        allowUnordered: false,
        benchmarksOnly: true,
    });

    eventSource.onmessage = async (event: any) => {
        const priceFeeds = JSON.parse(event.data).parsed;
        const storedOrders: IOrdersMap = await readJsonFile("./keeper/orders.json");
        priceFeeds.forEach((priceFeed: IPriceFeed) => {
            const pythPriceId: string = "0x" + priceFeed.id;
            const indexTokenAddress: string = getTokenAddress(tokens, pythPriceId);
            if (!storedOrders.hasOwnProperty(indexTokenAddress)) return;
            if (!storedOrders[indexTokenAddress]) return;

            Object.entries(storedOrders[indexTokenAddress]).forEach(([key, value]) => {
                console.log(priceFeed);
            });
        });
        eventSource.close();
    };

    eventSource.onerror = (error: any) => {
        console.error("Hermes Client got error: ", error);
        eventSource.close();
    };
}

function getTokenAddress(tokens: any[], pythPriceId: string): string {
    return tokens.find((token) => token.pythPriceId === pythPriceId).address;
}

runOrderKeeper();
