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
import { expandDecimals, settingUp } from "./utils";
import { getDataStoreContract } from "./helpers";
import { EXECUTION_ORDER_METHOD, USD_DECIMALS } from "./config";
import pc from "picocolors";
import setup from "./setup";

async function runOrderKeeper(): Promise<void> {
    setup();

    const { account, chainId } = await settingUp();

    // setup contract
    const dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>> =
        getDataStoreContract(chainId, account);
    const orderHandlerContract: TypedContractV2<SatoruContractAbi<SatoruContract.OrderHandler>> =
        createSatoruContract(chainId, SatoruContract.OrderHandler, OrderHandlerABI, account);

    const wssProvider: SatoruWebSocketProvider = getProvider(ProviderType.WSS, chainId);

    const eventHandler: SatoruEventHandler<SatoruEvent.OrderCreated> = async (event) => {
        const {
            key: rawOrderKey,
            order_type: rawOrderType,
            market: rawMarketKey,
            trigger_price: rawTriggerPrice,
        } = event.order;

        // init data
        const orderKey: string = toStarknetHexString(rawOrderKey);
        const orderType: OrderType = parseOrderType(rawOrderType);
        const market = await dataStoreContract.get_market(rawMarketKey);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);
        const executionContractPrice: bigint = cairoIntToBigInt(rawTriggerPrice);

        // validate order type
        validateOrderType(orderType);

        // execute order
        const params: Object = await setPriceParams(
            account,
            indexTokenAddress,
            executionContractPrice
        );
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
        console.info(pc.green(`with Transaction Hash: ${executeOrderReceipt.transaction_hash}`));
    } else {
        // TODO: retry here
    }
}

runOrderKeeper();
