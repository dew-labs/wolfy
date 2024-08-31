import {
    cairoIntToBigInt,
    createCall,
    createSatoruContract,
    createTokenContract,
    executeAndWait,
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
import { expandDecimals, readJsonFile, settingUp } from "./utils";
import { getDataStoreContract } from "./helpers";
import { EXECUTION_ORDER_METHOD, USD_DECIMALS } from "./config";
import pc from "picocolors";
import setup from "./setup";
import { HermesClient } from "@pythnetwork/hermes-client";
import type { IToken } from "./interface/token";
import type { IOrdersMap } from "./interface/order";
import type { IPriceFeed } from "./interface/priceFeed";

const executingOrders = new Set();

async function runOrderKeeper(): Promise<void> {
    setup();

    const { net, account, chainId, hermesUrl } = await settingUp();

    // setup contract
    const dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>> =
        getDataStoreContract(chainId, account);
    const orderHandlerContract: TypedContractV2<SatoruContractAbi<SatoruContract.OrderHandler>> =
        createSatoruContract(chainId, SatoruContract.OrderHandler, OrderHandlerABI, account);

    const connection = new HermesClient(hermesUrl, {});

    // get price ids
    let tokens: IToken[] = await readJsonFile(`./tokens.${net}.json`);
    if (!Array.isArray(tokens)) tokens = [];

    const priceIds = tokens.map((token) => token.pythPriceId);

    // Execute Limit Order Type
    // Streaming price updates
    const eventSource = await connection.getPriceUpdatesStream(priceIds, {
        encoding: "hex",
        parsed: true,
        allowUnordered: false,
        benchmarksOnly: true,
    });

    eventSource.onmessage = async (event: any) => {
        const priceFeeds: IPriceFeed[] = JSON.parse(event.data).parsed;
        const storedOrders: IOrdersMap = await readJsonFile("./keeper/orders.json");

        priceFeeds.forEach(async (priceFeed) => {
            const pythPriceId: string = "0x" + priceFeed.id;
            const indexTokenAddress: string = getTokenAddress(tokens, pythPriceId);

            if (!storedOrders[indexTokenAddress]) return;

            Object.entries(storedOrders[indexTokenAddress]).forEach(
                async ([orderKey, orderData]) => {
                    if (executingOrders.has(orderKey)) {
                        return;
                    }

                    executingOrders.add(orderKey);

                    const currentPriceDecimal = Math.abs(priceFeed.price.expo);

                    const isLong: boolean = orderData.is_long;
                    const currentPrice: bigint =
                        expandDecimals(priceFeed.price.price, USD_DECIMALS - currentPriceDecimal) /
                        expandDecimals(1, currentPriceDecimal);

                    const acceptablePrice: bigint = orderData.acceptable_price;

                    console.log("🚀 ~ currentPriceDecimal:   ", currentPriceDecimal);
                    console.log("🚀 ~ currentPrice:          ", currentPrice);
                    console.log("🚀 ~ acceptablePrice:       ", acceptablePrice);
                    if (!isPriceValidToExecute(isLong, currentPrice, acceptablePrice)) return;

                    // execute order
                    const params: Object = await setPriceParams(
                        account,
                        indexTokenAddress,
                        currentPrice
                    );
                    await executeOrder(orderHandlerContract, account, orderKey, params);
                    executingOrders.delete(orderKey);
                }
            );
        });
    };

    eventSource.onerror = (error: any) => {
        console.error(pc.red(`Hermes Client got error: ${error}`));
        eventSource.close();
    };
}

function getTokenAddress(tokens: any[], pythPriceId: string): string {
    return tokens.find((token) => token.pythPriceId === pythPriceId).address;
}

function isPriceValidToExecute(
    isLong: boolean,
    currentPrice: bigint,
    acceptablePrice: bigint
): boolean {
    if (isLong) {
        return currentPrice <= acceptablePrice;
    } else {
        return currentPrice >= acceptablePrice;
    }
}

async function setPriceParams(
    account: Account,
    indexTokenAddress: string,
    executionContractPrice: bigint
): Promise<Object> {
    const currentBlockNum = await account.getBlockNumber();
    const currentBlock = await account.getBlock();
    const block0 = 0;
    const block1 = currentBlockNum;

    return {
        signer_info: 1,
        tokens: [indexTokenAddress],
        compacted_min_oracle_block_numbers: [block0, block0],
        compacted_max_oracle_block_numbers: [block1, block1],
        compacted_oracle_timestamps: [currentBlock.timestamp, currentBlock.timestamp], // not in use
        compacted_decimals: [0, 0], // decimals of the price, not in use
        compacted_min_prices_indexes: [0], // not in use
        compacted_max_prices_indexes: [0], // not in use
        compacted_min_prices: [2147483648010000], // doesn't matter
        compacted_max_prices: [executionContractPrice], // this is the price where order executed
        signatures: [
            ["signatures1", "signatures2"],
            ["signatures1", "signatures2"],
        ],
        price_feed_tokens: [],
    };
}

async function executeOrder(
    orderHandlerContract: TypedContractV2<SatoruContractAbi<SatoruContract.OrderHandler>>,
    account: Account,
    orderKey: string,
    params: any
): Promise<void> {
    console.info(pc.blue("Executing Order ... 💨"));

    const executeOrderReceipt = await executeAndWait(
        account,
        createCall(orderHandlerContract, EXECUTION_ORDER_METHOD, [orderKey, params])
    );

    if (executeOrderReceipt.isSuccess()) {
        console.info(pc.green("Execute Successfully 🚀"));
        console.info(pc.green(`== with Transaction Hash: ${executeOrderReceipt.transaction_hash}`));
    } else {
        // TODO: retry here
    }
}

runOrderKeeper();
