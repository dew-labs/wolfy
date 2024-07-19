import { Contract, uint256 } from "starknet";
import { ensureDeployed, getCompiledSierra, getContracts, settingUp } from "../utils";

async function create_deposit() {
    const { account } = await settingUp();
    const contracts = getContracts();

    const compiledERC20SierraAbi = getCompiledSierra("ERC20").abi;

    const usdc = await ensureDeployed(account, contracts.USDC, "ERC20", {
        name: "USDC",
        symbol: "USDC",
        initial_supply: "10000000000000000000",
        recipient: account.address,
    });

    const zEth = await ensureDeployed(account, contracts.zETH, "ERC20", {
        name: "zEthereum",
        symbol: "zETH",
        initial_supply: "50000000000000000000000",
        recipient: account.address,
    });

    const usdcContract = new Contract(compiledERC20SierraAbi, usdc.address, account);
    const zEthContract = new Contract(compiledERC20SierraAbi, zEth.address, account);

    // Mint zETH to deposit vault, can comment if already minted
    console.log("Mint zETH to deposit vault");
    const transferCall = zEthContract.populate("mint", [
        contracts.DEPOSIT_VAULT,
        uint256.bnToUint256(50000000000000000000000000000n),
    ]);
    const transferTx = await zEthContract.mint(transferCall.calldata);
    await account.waitForTransaction(transferTx.transaction_hash);

    // Mint USDC to deposit vault, can comment if already minted
    console.log("Mint USDC to deposit vault");
    const transferUSDCCall2 = usdcContract.populate("mint", [
        contracts.DEPOSIT_VAULT,
        uint256.bnToUint256(50000000000000000000000000000n),
    ]);
    const transferUSDCTx2 = await usdcContract.mint(transferUSDCCall2.calldata);
    await account.waitForTransaction(transferUSDCTx2.transaction_hash);

    // const oracleContract = new Contract(getCompiledSierra("Oracle").abi, contracts.ORACLE, account);

    // // Set primary price of zETH in oracle
    // console.log("Set primary price of zETH in oracle");
    // const setPrimaryPriceCall1 = oracleContract.populate("set_primary_price", [
    //     zEthContract.address,
    //     {
    //         min: uint256.bnToUint256(5000n),
    //         max: uint256.bnToUint256(5000n),
    //     },
    // ]);
    // const setPrimaryPriceTx1 = await oracleContract.set_primary_price(
    //     setPrimaryPriceCall1.calldata
    // );
    // await account.waitForTransaction(setPrimaryPriceTx1.transaction_hash);

    // // Set primary price of USDC in oracle
    // console.log("Set primary price of USDC in oracle");
    // const setPrimaryPriceCall2 = oracleContract.populate("set_primary_price", [
    //     usdcContract.address,
    //     {
    //         min: uint256.bnToUint256(1n),
    //         max: uint256.bnToUint256(1n),
    //     },
    // ]);
    // const setPrimaryPriceTx2 = await oracleContract.set_primary_price(
    //     setPrimaryPriceCall2.calldata
    // );
    // await account.waitForTransaction(setPrimaryPriceTx2.transaction_hash);

    // console.log("Primary prices set.");
    console.log("Sending tokens to the deposit vault...");
    console.log("Creating Deposit...");

    const depositHandlerContract = new Contract(
        getCompiledSierra("DepositHandler").abi,
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
    const createOrderCall = depositHandlerContract.populate("create_deposit", [
        account.address,
        createDepositParams,
    ]);
    const createOrderTx = await depositHandlerContract.create_deposit(createOrderCall.calldata);
    await account.waitForTransaction(createOrderTx.transaction_hash);

    console.log("Deposit created.");
}

create_deposit();
