import { createAsker, expandDecimals, getContracts, settingUp } from "../../utils";
import { ExchangeRouterABI, toCairoCustomEnum } from "satoru-sdk";
import {
    createCall,
    createSatoruContract,
    createTokenContract,
    DataStoreABI,
    DecreasePositionSwapType,
    executeAndWait,
    OrderType,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { CairoUint256 } from "starknet";

async function createOrder() {
    const contracts = getContracts();

    const orderVaultAddress = contracts.OrderVault;
    if (!orderVaultAddress) throw new Error("OrderVault not set");

    const { account, chainId } = await settingUp();

    const dataStoreContract = createSatoruContract(
        chainId,
        SatoruContract.DataStore,
        DataStoreABI,
        account
    );

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

    const market = await dataStoreContract.get_market(marketToken);

    const indexTokenAddress = toStarknetHexString(market.index_token);
    const longTokenAddress = toStarknetHexString(market.long_token);
    const shortTokenAddress = toStarknetHexString(market.short_token);

    console.log("Index token:", indexTokenAddress);
    console.log("Long token:", longTokenAddress);
    console.log("Short token:", shortTokenAddress);

    const collateralTokenAddress = toStarknetHexString(market.long_token); // ETH

    const collateralAmount = expandDecimals(1n, 18); // 1ETH
    const size = expandDecimals(3500n, 18); // $3500
    const acceptablePrice = 3501; // TODO: should expand decimal too?

    const zEthContract = createTokenContract(chainId, collateralTokenAddress, account);
    const exchangeRouterContract = createSatoruContract(
        chainId,
        SatoruContract.ExchangeRouter,
        ExchangeRouterABI
    );

    const zEthBalanceResponse = await zEthContract.call("balance_of", [account.address]);
    console.log("zETH balance", String(zEthBalanceResponse));

    const createOrderParams = {
        receiver: account.address,
        callback_contract: "0",
        ui_fee_receiver: "0",
        market: marketToken,
        initial_collateral_token: collateralTokenAddress,
        swap_path: { snapshot: [] },
        size_delta_usd: new CairoUint256(size),
        initial_collateral_delta_amount: new CairoUint256(collateralAmount),
        trigger_price: new CairoUint256(0), // Market order doesn't need trigger price
        acceptable_price: new CairoUint256(acceptablePrice),
        execution_fee: new CairoUint256(0),
        callback_gas_limit: new CairoUint256(0),
        min_output_amount: new CairoUint256(0),
        order_type: toCairoCustomEnum(OrderType.MarketIncrease),
        decrease_position_swap_type: toCairoCustomEnum(DecreasePositionSwapType.NoSwap),
        is_long: true,
        referral_code: 0,
    };

    const transferAndCreateOrderReceipt = await executeAndWait(account, [
        createCall(zEthContract, "transfer", [
            orderVaultAddress,
            new CairoUint256(collateralAmount),
        ]),
        createCall(exchangeRouterContract, "create_order", [createOrderParams]),
    ]);

    if (transferAndCreateOrderReceipt.isSuccess()) {
        console.log("Order created.");
        const orderKey = transferAndCreateOrderReceipt.events[1]?.data[0];
        console.log(orderKey);
    } else {
        throw new Error("Order creation failed");
    }

    doneAsking();
}

createOrder();
