import {
    cairoIntToBigInt,
    getProvider,
    OrderType,
    parseOrderType,
    ProviderType,
    SatoruContract,
    SatoruEvent,
    toStarknetHexString,
    type SatoruContractAbi,
    type SatoruEventHandler,
    type SatoruWebSocketProvider,
} from "satoru-sdk";

import { getDataStoreContract } from "./helpers";
import { parseWithBigInt, settingUp, stringifyWithBigInt } from "./utils";
import fs from "node:fs";
import pc from "picocolors";
import setup from "./setup";
import type { IOrder } from "./interface/order";
import type { TypedContractV2 } from "starknet";

async function storeOrderKeeper(): Promise<void> {
    setup();

    const { account, chainId } = await settingUp();

    // setup contract
    const dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>> =
        getDataStoreContract(chainId, account);

    const wssProvider: SatoruWebSocketProvider = getProvider(ProviderType.WSS, chainId);

    const eventHandler: SatoruEventHandler<SatoruEvent.OrderCreated> = async (event) => {
        const {
            key,
            order_type,
            market: marketKey,
            trigger_price,
            acceptable_price,
            is_long,
        } = event.order;

        // init data
        const orderKey: string = toStarknetHexString(key);
        const orderType: OrderType = parseOrderType(order_type);
        const triggerPrice: bigint = cairoIntToBigInt(trigger_price);
        const acceptablePrice: bigint = cairoIntToBigInt(acceptable_price);

        const market = await dataStoreContract.get_market(marketKey);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);

        const orderData: IOrder = {
            order_type: orderType,
            trigger_price: triggerPrice,
            acceptable_price: acceptablePrice,
            is_long,
        };
        console.log(
            "🚀 ~ consteventHandler:SatoruEventHandler<SatoruEvent.OrderCreated>= ~ orderData:",
            orderData
        );

        // store to json
        await storeOrderToJsonFile("keeper/orders.json", indexTokenAddress, orderKey, orderData);
        console.info(pc.green("New Order Created 📝"));
        console.info(pc.green(`== with Order Key: ${orderKey}`));
    };

    await wssProvider.subscribeToEvent(SatoruEvent.OrderCreated, eventHandler);
}

function storeOrderToJsonFile(
    filePath: string,
    indexTokenAddress: string,
    orderKey: string,
    orderData: IOrder
) {
    fs.readFile(filePath, "utf8", (err: any, data: any) => {
        if (err) {
            console.error(`Error reading file from disk: ${err}`);
            return;
        }

        try {
            const jsonData = parseWithBigInt(data);

            if (!jsonData.hasOwnProperty(indexTokenAddress)) {
                jsonData[indexTokenAddress] = {};
            }

            jsonData[indexTokenAddress][orderKey] = orderData;

            fs.writeFile(filePath, stringifyWithBigInt(jsonData), "utf8", (err) => {
                if (err) {
                    console.error(`Error writing file to disk: ${err}`);
                }
            });
        } catch (err) {
            console.error(`Error parsing JSON string: ${err}`);
        }
    });
}

storeOrderKeeper();
