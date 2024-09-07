import {
    cairoIntToBigInt,
    createTokenContract,
    OrderType,
    parseOrderType,
    toStarknetHexString,
} from "satoru-sdk";
import { createAsker, expandDecimals, settingUp } from "../../../shared/utils/utils";
import { getDataStoreContract } from "../../../shared/utils/helpers";
import { USD_DECIMALS } from "../../../shared/utils/config";
import { executeOrder as utilExecuteOrder } from "../../../shared/utils/utils";
import type { Order } from "shared/interfaces/Order";

async function executeOrder() {
    // get order key from DataStore.get_account_order_keys
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    let orderKey = await ask("Enter order key (default to lastest order)");

    if (!orderKey) {
        const orderCount = BigInt(await dataStoreContract.get_order_count());
        if (orderCount === 0n) throw new Error("No order available");

        const lastOrder = (await dataStoreContract.get_order_keys(orderCount - 1n, orderCount))[0];
        if (!lastOrder) throw new Error("Invalid order");

        orderKey = toStarknetHexString(lastOrder);
        console.log("Order:", orderKey);
    }

    const order = await dataStoreContract.get_order(orderKey);

    console.log("Execution fee:", order.execution_fee);
    // TODO: shouldn't execute the order if fee is lowwer than configured

    const market = await dataStoreContract.get_market(order.market);
    const indexTokenAddress = toStarknetHexString(market.index_token);
    const indexToken = createTokenContract(chainId, indexTokenAddress);
    const indexTokenDecimals = await indexToken.decimals();

    const orderType = parseOrderType(order.order_type);
    const longOrShort = order.is_long ? "Long" : "Short";
    console.log("Order type:", longOrShort, orderType);

    console.log(order);

    const triggerPrice: bigint = cairoIntToBigInt(order.trigger_price);
    const acceptablePrice: bigint = cairoIntToBigInt(order.acceptable_price);

    const executeOrder: Order = {
        key: orderKey,
        market: order.market,
        order_type: orderType,
        trigger_price: triggerPrice,
        acceptable_price: acceptablePrice,
        is_long: order.is_long,
    };

    let executionPrice = await ask("Execution price (usd) (default to trigger price for limit)");

    let executionContractPrice = 0n;

    if (!executionPrice) {
        if (
            [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(
                orderType
            )
        ) {
            throw new Error("Market order must have a execution price");
        }
        executionContractPrice = cairoIntToBigInt(order.trigger_price);
        console.log("Execute at", order.trigger_price);
    } else {
        executionContractPrice =
            expandDecimals(executionPrice, USD_DECIMALS) / expandDecimals(1, indexTokenDecimals);
    }

    await utilExecuteOrder(account, executeOrder, executionContractPrice);

    doneAsking();
}

executeOrder();
