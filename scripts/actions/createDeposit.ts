import { Contract, uint256 } from "starknet";
import dotenv from "dotenv";
import { ensureDeployed, getCompiledSierra, settingUp } from "../utils";

dotenv.config();

async function create_deposit() {
    const account0 = await settingUp();

    const marketTokenAddress = process.env.MARKET_TOKEN as string;
    const depositVaultAddress = process.env.DEPOSIT_VAULT as string;
    const oracleAddress = process.env.ORACLE as string;

    const compiledERC20SierraAbi = getCompiledSierra("ERC20").abi;

    const usdc = await ensureDeployed(account0, process.env.USDC, "ERC20", {
        name: "USDC",
        symbol: "USDC",
        initial_supply: "10000000000000000000",
        recipient: account0.address,
    });

    const zEth = await ensureDeployed(account0, process.env.zETH, "ERC20", {
        name: "zEthereum",
        symbol: "zETH",
        initial_supply: "50000000000000000000000",
        recipient: account0.address,
    });

    const usdcContract = new Contract(compiledERC20SierraAbi, usdc.address, account0);
    const zEthContract = new Contract(compiledERC20SierraAbi, zEth.address, account0);

    // Mint zETH to deposit vault, can comment if already minted
    console.log("Mint zETH to deposit vault");
    const transferCall = zEthContract.populate("mint", [
        depositVaultAddress,
        uint256.bnToUint256(50000000000000000000000000000n),
    ]);
    const transferTx = await zEthContract.mint(transferCall.calldata);
    await account0.waitForTransaction(transferTx.transaction_hash);

    // Mint USDC to deposit vault, can comment if already minted
    console.log("Mint USDC to deposit vault");
    const transferUSDCCall2 = usdcContract.populate("mint", [
        depositVaultAddress,
        uint256.bnToUint256(50000000000000000000000000000n),
    ]);
    const transferUSDCTx2 = await usdcContract.mint(transferUSDCCall2.calldata);
    await account0.waitForTransaction(transferUSDCTx2.transaction_hash);

    const abiOracle = getCompiledSierra("Oracle").abi;
    const oracleContract = new Contract(abiOracle, oracleAddress, account0);

    // Set primary price of zETH in oracle
    console.log("Set primary price of zETH in oracle");
    const setPrimaryPriceCall1 = oracleContract.populate("set_primary_price", [
        zEthContract.address,
        {
            min: uint256.bnToUint256(5000n),
            max: uint256.bnToUint256(5000n),
        },
    ]);
    const setPrimaryPriceTx1 = await oracleContract.set_primary_price(
        setPrimaryPriceCall1.calldata
    );
    await account0.waitForTransaction(setPrimaryPriceTx1.transaction_hash);

    // Set primary price of USDC in oracle
    console.log("Set primary price of USDC in oracle");
    const setPrimaryPriceCall2 = oracleContract.populate("set_primary_price", [
        usdcContract.address,
        {
            min: uint256.bnToUint256(1n),
            max: uint256.bnToUint256(1n),
        },
    ]);
    const setPrimaryPriceTx2 = await oracleContract.set_primary_price(
        setPrimaryPriceCall2.calldata
    );
    await account0.waitForTransaction(setPrimaryPriceTx2.transaction_hash);

    console.log("Primary prices set.");
    console.log("Sending tokens to the deposit vault...");
    console.log("Creating Deposit...");

    const depositHandlerContract = new Contract(
        getCompiledSierra("DepositHandler").abi,
        process.env.DEPOSIT_HANDLER as string,
        account0
    );

    const createDepositParams = {
        receiver: account0.address,
        callback_contract: 0,
        ui_fee_receiver: 0,
        market: marketTokenAddress,
        initial_long_token: zEthContract.address,
        initial_short_token: usdcContract.address,
        long_token_swap_path: [],
        short_token_swap_path: [],
        min_market_tokens: uint256.bnToUint256(0),
        execution_fee: uint256.bnToUint256(0),
        callback_gas_limit: uint256.bnToUint256(0),
    };
    const createOrderCall = depositHandlerContract.populate("create_deposit", [
        account0.address,
        createDepositParams,
    ]);
    const createOrderTx = await depositHandlerContract.create_deposit(createOrderCall.calldata);
    await account0.waitForTransaction(createOrderTx.transaction_hash);

    console.log("Deposit created.");
}

create_deposit();
