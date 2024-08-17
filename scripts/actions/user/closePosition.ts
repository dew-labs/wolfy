import { createAsker, expandDecimals, getContracts, settingUp } from "../../utils";
import { toCairoCustomEnum } from "satoru-sdk";
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
} from "../../helpers";
import { CairoUint256 } from "starknet";

async function closePosition() {
    const contracts = getContracts();

    const orderVaultAddress = contracts.OrderVault;
    if (!orderVaultAddress) throw new Error("OrderVault not set");

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    const { ask, doneAsking } = createAsker();

    const marketToken = await askOrLatestMarketToken(ask, chainId);

    const market = await dataStoreContract.get_market(marketToken);

    const collateralTokenAddress = toStarknetHexString(market.long_token); // ETH

    const collateralAmount = expandDecimals(1n, 18); // 1ETH = 1000000000000000000
    const size = expandDecimals(3500n, 18); // $3500 = 3500000000000000000000
    const acceptablePrice = 3501; // TODO: should expand decimal too?

    const collateralTokenContract = createTokenContract(chainId, collateralTokenAddress, account);
    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    const zEthBalanceResponse = await collateralTokenContract.balance_of(account.address);
    console.log("Collateral balance", String(zEthBalanceResponse));

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
        order_type: toCairoCustomEnum(OrderType.MarketDecrease),
        decrease_position_swap_type: toCairoCustomEnum(DecreasePositionSwapType.NoSwap),
        is_long: true,
        referral_code: 0,
    };

    await executeAndGetResult(
        account,
        [
            createCall(collateralTokenContract, "transfer", [
                orderVaultAddress,
                new CairoUint256(collateralAmount),
            ]),
            createCall(exchangeRouterContract, "create_order", [createOrderParams]),
        ],
        (receipt) => {
            console.log("Long order created.");
            const orderKey = receipt.events[1]?.data[0];
            console.log(orderKey);
        },
        "Long order creation failed"
    );

    doneAsking();
}

closePosition();
