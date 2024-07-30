import { executeAndWait, getContracts, newContract, settingUp } from "../../utils";
import { uint256, CairoCustomEnum } from "starknet";
import ERC20ABI from "../../../artifacts/ERC20ABI";
import ExchangeRouterABI from "../../../artifacts/ExchangeRouterABI";

async function create_market() {
    const { account } = await settingUp();
    const contracts = getContracts();

    const marketTokenAddress = contracts.MARKET_TOKEN;
    const zEthAddress: string = contracts.zETH;

    const longAmount = 1000000000000000000; // 1ETH
    const size = 3500000000000000000000; // $3500
    const acceptablePrice = 3501;

    const zEthContract = newContract(ERC20ABI, zEthAddress, account);
    const exchangeRouterContract = newContract(
        ExchangeRouterABI,
        contracts.EXCHANGE_ROUTER,
        account
    );

    const zEthBalanceResponse = await zEthContract.call("balance_of", [account.address]);
    console.log("zETH balance", String(zEthBalanceResponse));

    const createOrderParams = {
        receiver: account.address,
        callback_contract: 0,
        ui_fee_receiver: 0,
        market: marketTokenAddress,
        initial_collateral_token: zEthAddress,
        swap_path: [],
        size_delta_usd: uint256.bnToUint256(size),
        initial_collateral_delta_amount: uint256.bnToUint256(longAmount),
        trigger_price: uint256.bnToUint256(0),
        acceptable_price: uint256.bnToUint256(acceptablePrice),
        execution_fee: uint256.bnToUint256(0),
        callback_gas_limit: uint256.bnToUint256(0),
        min_output_amount: uint256.bnToUint256(0),
        order_type: new CairoCustomEnum({ MarketIncrease: {} }),
        decrease_position_swap_type: new CairoCustomEnum({ NoSwap: {} }),
        is_long: true,
        referral_code: 0,
    };

    const transferAndCreateOrderReceipt = await executeAndWait(
        [
            zEthContract.populate("transfer", [
                contracts.ORDER_VAULT,
                uint256.bnToUint256(longAmount),
            ]),
            exchangeRouterContract.populate("create_order", [createOrderParams]),
        ],
        account
    );

    if (transferAndCreateOrderReceipt.isSuccess()) {
        console.log("Order created.");
        const orderKey = transferAndCreateOrderReceipt.events[1].data[0];
        console.log(orderKey);
        return;
    }

    throw new Error("Order creation failed");
}

create_market();
