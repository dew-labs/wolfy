import {
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
    SatoruEvent,
    SatoruEventHandler,
    SatoruWebSocketProvider,
    toStarknetHexString,
} from "satoru-sdk";

import { Account } from "starknet";
import { expandDecimals, settingUp } from "../scripts/utils";
import { getDataStoreContract } from "../scripts/helpers";
import { USD_DECIMALS } from "../scripts/config";
import chalk from "chalk";
import setup from "../scripts/setup";

async function createOrderListener(): Promise<void> {
    setup();

    const { account, chainId } = await settingUp();

    // setup contract
    const dataStoreContract = getDataStoreContract(chainId, account);
    const orderHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.OrderHandler,
        OrderHandlerABI,
        account
    );
    const wssProvider: SatoruWebSocketProvider = getProvider(ProviderType.WSS, chainId);

    const eventHandler: SatoruEventHandler<SatoruEvent.OrderCreated> = async (event) => {
        const {
            key: rawOrderKey,
            order_type: rawOrderType,
            market: rawMarketKey,
            trigger_price: triggerPrice,
        } = event["satoru::event::event_emitter::EventEmitter::OrderCreated"].order;

        // init data
        const orderKey: string = toStarknetHexString(rawOrderKey);
        const orderType: OrderType = parseOrderType(rawOrderType);
        const market = await dataStoreContract.get_market(rawMarketKey);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);
        const indexToken = createTokenContract(chainId, indexTokenAddress);
        const indexTokenDecimals: number | bigint = await indexToken.decimals();

        // calculate execution price
        const executionPrice: bigint =
            expandDecimals(triggerPrice, USD_DECIMALS) / expandDecimals(1, indexTokenDecimals);

        // validate order type
        validateOrderType(orderType);

        // execute order
        const params: Object = await setPriceParams(account, indexTokenAddress, executionPrice);
        await executeOrder(orderHandlerContract, account, orderKey, params);
    };

    await wssProvider.subscribeToEvent(SatoruEvent.OrderCreated, eventHandler);
}

function validateOrderType(orderType: OrderType): void {
    if (
        [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(
            orderType
        )
    ) {
        throw new Error("Market order must have a execution price");
    }
}

async function setPriceParams(
    account: Account,
    indexTokenAddress: string,
    executionPrice: BigInt
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
        compacted_max_prices: [executionPrice], // this is the price where order executed
        signatures: [
            ["signatures1", "signatures2"],
            ["signatures1", "signatures2"],
        ],
        price_feed_tokens: [],
    };
}

async function executeOrder(orderHandlerContract, account, orderKey, params): Promise<void> {
    console.info(chalk.blue("Executing", chalk.bold("Order"), "... 💨"));

    const executeOrderReceipt = await executeAndWait(
        account,
        createCall(orderHandlerContract, "execute_order", [orderKey, params])
    );

    if (executeOrderReceipt.isSuccess()) {
        console.info(chalk.green("Execute", chalk.bold("Order"), "Successfully 🚀"));
        console.info(chalk.green(`with Transaction Hash: ${executeOrderReceipt.transaction_hash}`));
    } else {
        // TODO: retry here
    }
}

createOrderListener();
