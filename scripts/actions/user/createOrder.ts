import { createAsker, expandDecimals, getContracts, settingUp } from "@shared/utils/utils";
import { cairoIntToBigInt, toCairoCustomEnum } from "satoru-sdk";
import {
    createCall,
    createTokenContract,
    DecreasePositionSwapType,
    OrderType,
    toStarknetHexString,
} from "satoru-sdk";
import {
    askOrLatestMarketToken,
    executeAndGetResult,
    getDataStoreContract,
    getExchangeRouterContract,
} from "@shared/utils/helpers";
import { CairoUint256, shortString } from "starknet";
import { USD_DECIMALS } from "@shared/utils/config";

async function createOrder() {
    const contracts = getContracts();

    const orderVaultAddress = contracts.OrderVault;
    if (!orderVaultAddress) throw new Error("OrderVault not set");

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    const { ask, doneAsking } = createAsker();

    const marketToken = await askOrLatestMarketToken(ask, chainId);

    const market = await dataStoreContract.get_market(marketToken);

    const marketTokenContract = createTokenContract(
        chainId,
        toStarknetHexString(market.index_token)
    );

    console.log(
        "Index:",
        shortString.decodeShortString(String(await marketTokenContract.symbol()))
    );

    const longToken = createTokenContract(chainId, toStarknetHexString(market.long_token));
    const shortToken = createTokenContract(chainId, toStarknetHexString(market.short_token));
    const indexToken = createTokenContract(chainId, toStarknetHexString(market.index_token));

    const indexTokenDecimals = await indexToken.decimals();

    console.log("Long:", shortString.decodeShortString(String(await longToken.symbol())));
    console.log("Short", shortString.decodeShortString(String(await shortToken.symbol())));

    let collateralTokenInput = await ask("Collateral token (L/S) (default to long)");

    if (!collateralTokenInput || !["l", "s"].includes(collateralTokenInput.toLowerCase()))
        collateralTokenInput = "l";

    const collateralTokenAddress =
        collateralTokenInput === "l"
            ? toStarknetHexString(market.long_token)
            : toStarknetHexString(market.short_token);

    const collateralTokenContract = createTokenContract(chainId, collateralTokenAddress, account);

    const collateralDecimals = await createTokenContract(
        chainId,
        collateralTokenAddress
    ).decimals();

    const balanceResponse =
        Number(cairoIntToBigInt(await collateralTokenContract.balance_of(account.address))) /
        Number(expandDecimals(1, collateralDecimals));
    console.log("Collateral balance", String(balanceResponse));

    let collateralAmountInput = Number(await ask("Collateral amount (default to 1)")) || 1;

    const collateralAmount = expandDecimals(collateralAmountInput, collateralDecimals);

    let sizeInput = Number(await ask("Order size (usd) (default to 3500)")) || 3500;
    const size = expandDecimals(sizeInput, USD_DECIMALS);

    // "MarketSwap"; // care later
    // "LimitSwap"; // care later
    // "MarketIncrease";
    // "LimitIncrease";
    // "MarketDecrease";
    // "LimitDecrease";
    // "StopLossDecrease"; // care later
    // "Liquidation";

    let marketOrLimit = await ask("Limit or market (L/M) (default to limit)");
    if (!marketOrLimit || !["l", "m"].includes(marketOrLimit.toLowerCase())) marketOrLimit = "l";

    let increaseOrDecrease = await ask("Increase or decrease (I/D) (default to increase)");
    if (!increaseOrDecrease || !["i", "d"].includes(increaseOrDecrease.toLowerCase()))
        increaseOrDecrease = "i";

    let triggerPrice: bigint | number = 0n;
    let acceptablePrice;

    if (marketOrLimit === "l") {
        // Market order doesn't need trigger price
        triggerPrice = Number(await ask("Trigger price (usd) (default to 3500)")) || 3500;
        triggerPrice =
            expandDecimals(triggerPrice, USD_DECIMALS) / expandDecimals(1, indexTokenDecimals);
        acceptablePrice = triggerPrice; // TODO: Apply slippage
    } else {
        acceptablePrice = Number(await ask("Acceptable price (usd) (default to 3500)")) || 3500;
    }

    const orderType = (() => {
        if (marketOrLimit === "l") {
            if (increaseOrDecrease === "i") {
                return OrderType.LimitIncrease;
            } else {
                return OrderType.LimitDecrease;
            }
        } else {
            if (increaseOrDecrease === "i") {
                return OrderType.MarketIncrease;
            } else {
                return OrderType.MarketDecrease;
            }
        }
    })();

    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    const createOrderParams = {
        receiver: account.address,
        callback_contract: "0",
        ui_fee_receiver: "0",
        market: marketToken,
        initial_collateral_token: collateralTokenAddress,
        swap_path: { snapshot: [] },
        size_delta_usd: new CairoUint256(size),
        initial_collateral_delta_amount: new CairoUint256(collateralAmount),
        trigger_price: new CairoUint256(triggerPrice),
        acceptable_price: new CairoUint256(acceptablePrice),
        execution_fee: new CairoUint256(0), // Fee to the keeper to execute the order
        callback_gas_limit: new CairoUint256(0),
        min_output_amount: new CairoUint256(0), // The minimum output amount for decrease orders and swaps
        order_type: toCairoCustomEnum(orderType),
        decrease_position_swap_type: toCairoCustomEnum(DecreasePositionSwapType.NoSwap),
        is_long: true,
        referral_code: 0,
    };

    console.log(createOrderParams);

    const calls = [];

    if (increaseOrDecrease === "i") {
        calls.push(
            createCall(collateralTokenContract, "transfer", [
                orderVaultAddress,
                new CairoUint256(collateralAmount),
            ])
        );
    }

    calls.push(createCall(exchangeRouterContract, "create_order", [createOrderParams]));

    await executeAndGetResult(
        account,
        calls,
        (receipt) => {
            console.log("Order created.");
            const orderKey = receipt.events[1]?.data[0];
            console.log(orderKey);
        },
        "Order creation failed"
    );

    doneAsking();
}

createOrder();
