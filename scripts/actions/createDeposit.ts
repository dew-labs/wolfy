import { Contract, uint256 } from "starknet";
import {
    ensureDeployed,
    ensureRole,
    executeAndWait,
    getCompiledSierra,
    getContracts,
    newContract,
    settingUp,
} from "../utils";
import ERC20ABI from "../../artifacts/ERC20ABI";
import RoleStoreABI from "../../artifacts/RoleStoreABI";
import ExchangeRouterABI from "../../artifacts/ExchangeRouterABI";
import DepositHandlerABI from "../../artifacts/DepositHandlerABI";
import { log } from "console";

async function create_deposit() {
    const { account } = await settingUp();
    const contracts = getContracts();

    const longTokenAmount = 50000000000000000000000000000;
    const shortTokenAmount = 50000000000000000000000000000;

    // index token, long token
    const zEth = await ensureDeployed(account, contracts.zETH, "ERC20", {
        name: "zEthereum",
        symbol: "zETH",
        initial_supply: 1000000,
        recipient: account.address,
    });

    // short token
    const usdc = await ensureDeployed(account, contracts.USDC, "ERC20", {
        name: "USDC",
        symbol: "USDC",
        initial_supply: 1000000,
        recipient: account.address,
    });

    const usdcContract = newContract(ERC20ABI, usdc.address, account);
    const zEthContract = newContract(ERC20ABI, zEth.address, account);

    const roleStoreContract = newContract(RoleStoreABI, contracts.ROLE_STORE, account);
    const exchangeRouter = newContract(ExchangeRouterABI, contracts.EXCHANGE_ROUTER, account);

    console.log("Granting roles...");
    await ensureRole(roleStoreContract, "ExchangeRouter", exchangeRouter.address, "ROUTER_PLUGIN");
    await ensureRole(roleStoreContract, "Account0", account.address, "ROUTER_PLUGIN");

    console.log("Approve, mint and sending tokens to the deposit vault..."); // The mint step is to make sure account have enough balance
    await executeAndWait(
        [
            zEthContract.populate("approve", [
                account.address,
                uint256.bnToUint256(longTokenAmount),
            ]),
            zEthContract.populate("mint", [account.address, uint256.bnToUint256(longTokenAmount)]),
            exchangeRouter.populate("send_tokens", [
                zEth.address,
                contracts.DEPOSIT_VAULT,
                uint256.bnToUint256(longTokenAmount),
            ]),
            usdcContract.populate("approve", [
                account.address,
                uint256.bnToUint256(shortTokenAmount),
            ]),
            usdcContract.populate("mint", [account.address, uint256.bnToUint256(shortTokenAmount)]),
            exchangeRouter.populate("send_tokens", [
                usdc.address,
                contracts.DEPOSIT_VAULT,
                uint256.bnToUint256(shortTokenAmount),
            ]),
        ],
        account
    );

    console.log("Creating Deposit...");

    const depositHandlerContract = newContract(
        DepositHandlerABI,
        contracts.DEPOSIT_HANDLER as string,
        account
    );

    const createDepositParams = {
        receiver: account.address,
        callback_contract: 0,
        ui_fee_receiver: 0,
        market: contracts.MARKET_TOKEN,
        initial_long_token: zEthContract.address,
        initial_short_token: usdcContract.address,
        long_token_swap_path: [],
        short_token_swap_path: [],
        min_market_tokens: uint256.bnToUint256(0),
        execution_fee: uint256.bnToUint256(0),
        callback_gas_limit: uint256.bnToUint256(0),
    };

    const createDepositReceipt = await executeAndWait(
        depositHandlerContract.populate("create_deposit", [account.address, createDepositParams]),
        account
    );

    if (createDepositReceipt.isSuccess()) {
        const depositKey = createDepositReceipt.events[0].data[0];

        console.log("Deposit created.");
        console.log(depositKey);
        return;
    }

    throw new Error("Deposit creation failed");
}

create_deposit();
