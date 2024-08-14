import { getContracts, settingUp } from "../../utils";
import { CairoUint256 } from "starknet";
import ExchangeRouterABI from "../../../artifacts/ExchangeRouterABI";
import {
    createCall,
    createSatoruContract,
    createTokenContract,
    DecreasePositionSwapType,
    executeAndWait,
    OrderType,
    SatoruContract,
    toCairoCustomEnum,
} from "satoru-sdk";

async function create_long_order() {
    const { account, chainId } = await settingUp();
    const contracts = getContracts();

    const orderVaultAddress = contracts.OrderVault;
    const marketTokenAddress = contracts.MarketToken;
    const zEthAddress = contracts.zETH;

    if (!orderVaultAddress || !marketTokenAddress || !zEthAddress) {
        throw new Error("Contracts not found");
    }

    const longAmount = 1000000000000000000; // 1ETH
    const size = 3500000000000000000000; // $3500
    const acceptablePrice = 3501;

    const zEthContract = createTokenContract(chainId, zEthAddress, account);
    const exchangeRouterContract = createSatoruContract(
        chainId,
        SatoruContract.ExchangeRouter,
        ExchangeRouterABI,
        account
    );

    const zEthBalanceResponse = await zEthContract.balance_of(account.address);
    console.log("zETH balance", String(zEthBalanceResponse));

    const createOrderParams = {
        receiver: account.address,
        callback_contract: "0x0",
        ui_fee_receiver: "0x0",
        market: marketTokenAddress,
        initial_collateral_token: zEthAddress,
        swap_path: { snapshot: [] },
        size_delta_usd: new CairoUint256(size),
        initial_collateral_delta_amount: new CairoUint256(longAmount),
        trigger_price: new CairoUint256(0),
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
        createCall(zEthContract, "transfer", [orderVaultAddress, new CairoUint256(longAmount)]),
        createCall(exchangeRouterContract, "create_order", [createOrderParams]),
    ]);

    if (transferAndCreateOrderReceipt.isSuccess()) {
        console.log("Order created.");
        const orderKey = transferAndCreateOrderReceipt.events[1]?.data[0];
        console.log("Order key:", orderKey);
        return;
    }

    throw new Error("Order creation failed");
}

create_long_order();
