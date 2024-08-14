import {
    createCall,
    createSatoruContract,
    createTokenContract,
    grantRole,
    OrderHandlerABI,
    SatoruContract,
    SatoruRole,
} from "satoru-sdk";
import { getCompiledSierra, getContracts, settingUp } from "../../utils";
import {
    Account,
    Contract,
    json,
    Calldata,
    CallData,
    RpcProvider,
    shortString,
    CairoUint256,
    CairoCustomEnum,
    ec,
} from "starknet";

async function create_market() {
    const { account, chainId } = await settingUp();
    const contracts = getContracts();

    const marketTokenAddress = "0x4b3bd2fe7f3dd02a6a143a3040ede80048388e0cf1c20dc748d6a6d6fa93069";
    const eth: string = "0x75acffcc1c3661fe1cfbb6d2c444355ef01e85a40e65962a4d9a2ac38903934";
    const usdc: string = "0x70d22d4962de09d9ec0a590e9ff33a496425277235890575457f9582d837964";

    const orderHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.OrderHandler,
        OrderHandlerABI,
        account
    );

    const ethContract = createTokenContract(chainId, eth as string, account);
    const transferCall = createCall(ethContract, "transfer", [
        contracts.OrderVault as string,
        new CairoUint256(1000000000000000000n),
    ]);
    const transferTx = await ethContract.transfer(transferCall.calldata);
    await account.waitForTransaction(transferTx.transaction_hash);

    console.log("Granting roles...");

    grantRole(
        chainId,
        account,
        "0x05fc5a52d7141a90b79663eb22b80f7a13ec1fce7232bc8c4a03528f552cb02b",
        SatoruRole.CONTROLLER
    );

    const createOrderParams = {
        receiver: account.address,
        callback_contract: 0,
        ui_fee_receiver: 0,
        market: 0,
        initial_collateral_token: eth,
        swap_path: [marketTokenAddress],
        size_delta_usd: new CairoUint256(5000000000000000000000n),
        initial_collateral_delta_amount: new CairoUint256(1000000000000000000n),
        trigger_price: new CairoUint256(0),
        acceptable_price: new CairoUint256(0),
        execution_fee: new CairoUint256(0),
        callback_gas_limit: new CairoUint256(0),
        min_output_amount: new CairoUint256(0),
        order_type: new CairoCustomEnum({ MarketSwap: {} }),
        decrease_position_swap_type: new CairoCustomEnum({ NoSwap: {} }),
        is_long: 0,
        referral_code: 0,
    };
    const createOrderCall = createCall(orderHandlerContract, "create_order", [
        account.address,
        createOrderParams,
    ]);
    const createOrderTx = await orderHandlerContract.create_order(createOrderCall.calldata);
    await account.waitForTransaction(createOrderTx.transaction_hash);
    console.log("Order created.");
}

create_market();
