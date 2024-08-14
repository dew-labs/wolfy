import { createSatoruContract, createTokenContract, SatoruContract } from "satoru-sdk";
import { getCompiledSierra, getContracts, settingUp } from "../../utils";
import { Contract, shortString, CairoUint256, CairoCustomEnum, ec } from "starknet";
import OrderHandlerABI from "artifacts/OrderHandlerABI";

async function create_market() {
    const { account, chainId } = await settingUp();
    const contracts = getContracts();

    const marketTokenAddress = "0x69cfad927e7e4ef53261ad9a4630631ff8404746720ce3c73368de8291c4c4d";
    const eth: string = "0x376bbceb1a044263cba28211fdcaee4e234ebf0c012521e1b258684bbc44949";
    const usdc: string = "0x42a9a03ceb10ca07d3f598a627c414fe218b1138a78e3da6ce1675680cf95f2";

    const orderHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.OrderHandler,
        OrderHandlerABI,
        account
    );
    const compiledERC20Sierra = getCompiledSierra("ERC20");

    const ethContract = createTokenContract(chainId, eth as string, account);
    const transferCall = createCall(ethContract, "transfer", [
        contracts.OrderVault as string,
        new CairoUint256(1000000000000000000n),
    ]);
    const transferTx = await ethContract.transfer(transferCall.calldata);
    await account.waitForTransaction(transferTx.transaction_hash);

    const createOrderParams = {
        receiver: account.address,
        callback_contract: 0,
        ui_fee_receiver: 0,
        market: marketTokenAddress,
        initial_collateral_token: eth,
        swap_path: [],
        size_delta_usd: new CairoUint256(10000000000000000000000n),
        initial_collateral_delta_amount: new CairoUint256(2000000000000000000n),
        trigger_price: new CairoUint256(5000),
        acceptable_price: new CairoUint256(5500),
        execution_fee: new CairoUint256(0),
        callback_gas_limit: new CairoUint256(0),
        min_output_amount: new CairoUint256(0),
        order_type: new CairoCustomEnum({ MarketIncrease: {} }),
        decrease_position_swap_type: new CairoCustomEnum({ NoSwap: {} }),
        is_long: 1,
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
