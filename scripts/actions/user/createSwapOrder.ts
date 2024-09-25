import {
    askOrLatestMarketToken,
    createAsker,
    executeAndGetResult,
    getContracts,
    getDataStoreContract,
    getExchangeRouterContract,
    settingUp,
} from "@wolfy/shared/utils";
import {
    createCall,
    createTokenContract,
    DecreasePositionSwapType,
    OrderType,
    toCairoCustomEnum,
    toStarknetHexString,
} from "satoru-sdk";
import { CairoUint256 } from "starknet";

// TODO: update this script
async function createSwapOrder() {
    const contracts = getContracts();

    const orderVaultAddress = contracts.OrderVault;
    if (!orderVaultAddress) throw new Error("OrderVault not set");

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    const { ask, doneAsking } = createAsker();

    let marketToken = await askOrLatestMarketToken(ask, chainId);

    const market = await dataStoreContract.get_market(marketToken);

    const marketTokenAddress = toStarknetHexString(market.market_token);
    const longTokenAddress = toStarknetHexString(market.long_token);
    const shortTokenAddress = toStarknetHexString(market.short_token);

    const longTokenContract = createTokenContract(chainId, longTokenAddress, account);
    const exchangeRouterContract = getExchangeRouterContract(chainId, account);

    const createOrderParams = {
        receiver: account.address,
        callback_contract: "0",
        ui_fee_receiver: "0",
        market: "0",
        initial_collateral_token: longTokenAddress,
        swap_path: { snapshot: [marketTokenAddress] },
        size_delta_usd: new CairoUint256(5000000000000000000000n),
        initial_collateral_delta_amount: new CairoUint256(1000000000000000000n),
        trigger_price: new CairoUint256(0),
        acceptable_price: new CairoUint256(0),
        execution_fee: new CairoUint256(0),
        callback_gas_limit: new CairoUint256(0),
        min_output_amount: new CairoUint256(0),
        order_type: toCairoCustomEnum(OrderType.MarketSwap),
        decrease_position_swap_type: toCairoCustomEnum(DecreasePositionSwapType.NoSwap),
        is_long: false,
        referral_code: 0,
    };

    await executeAndGetResult(
        account,
        [
            createCall(longTokenContract, "transfer", [
                orderVaultAddress,
                new CairoUint256(1000000000000000000n),
            ]),
            createCall(exchangeRouterContract, "create_order", [createOrderParams]),
        ],
        (receipt) => {
            console.log("Swap order created.");
            const orderKey = receipt.events[1]?.data[0];
            console.log(orderKey);
        },
        "Swap order creation failed"
    );

    doneAsking();
}

createSwapOrder();
