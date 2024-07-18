import { Account, Contract, RpcProvider, shortString, uint256, ec } from "starknet";
import dotenv from "dotenv";
import { ensureDeployed, ensureRole, getCompiledSierra, settingUp } from "../utils";

dotenv.config();

async function create_market() {
    const account0 = await settingUp();

    let eth = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

    const dataStoreAddress = process.env.DATA_STORE as string;
    const feeTokenAddress = process.env.FEE_TOKEN as string;
    const marketFactoryAddress = process.env.MARKET_FACTORY as string;
    const roleStoreAddress = process.env.ROLE_STORE as string;

    const dataStoreContract = new Contract(
        getCompiledSierra("DataStore").abi,
        dataStoreAddress,
        account0
    );

    const dataCall = dataStoreContract.populate("set_address", [
        ec.starkCurve.poseidonHashMany([BigInt(shortString.encodeShortString("FEE_TOKEN"))]),
        feeTokenAddress,
    ]);
    const setAddressTx = await dataStoreContract.set_address(dataCall.calldata);
    await account0.waitForTransaction(setAddressTx.transaction_hash);

    const dataCall2 = dataStoreContract.populate("set_u256", [
        ec.starkCurve.poseidonHashMany([
            BigInt(shortString.encodeShortString("MAX_SWAP_PATH_LENGTH")),
        ]),
        5n,
    ]);
    const setAddressTx2 = await dataStoreContract.set_u256(dataCall2.calldata);
    await account0.waitForTransaction(setAddressTx2.transaction_hash);

    const dataCall3 = dataStoreContract.populate("set_u256", [
        ec.starkCurve.poseidonHashMany([
            BigInt(shortString.encodeShortString("MAX_ORACLE_PRICE_AGE")),
        ]),
        1000000000000n,
    ]);
    const setAddressTx3 = await dataStoreContract.set_u256(dataCall3.calldata);
    await account0.waitForTransaction(setAddressTx3.transaction_hash);

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

    const roleStoreContract = new Contract(
        getCompiledSierra("RoleStore").abi,
        roleStoreAddress,
        account0
    );

    await ensureRole(roleStoreContract, "MarketFactory", marketFactoryAddress, "CONTROLLER");

    const marketFactoryContract = new Contract(
        getCompiledSierra("MarketFactory").abi,
        marketFactoryAddress,
        account0
    );

    console.log("Connected to MarketFactory: " + marketFactoryAddress);

    console.log("Granting roles...");

    await ensureRole(roleStoreContract, "MarketFactory", marketFactoryAddress, "MARKET_KEEPER");

    await ensureRole(
        roleStoreContract,
        "DepositHandler",
        process.env.DEPOSIT_HANDLER!,
        "CONTROLLER"
    );

    await ensureRole(roleStoreContract, "OrderHandler", process.env.ORDER_HANDLER!, "CONTROLLER");

    console.log("Roles granted. Creating Market...");

    const compiledERC20Sierra = getCompiledSierra("ERC20");

    const usdcContract = new Contract(compiledERC20Sierra.abi, usdc.address, account0);
    const zEthContract = new Contract(compiledERC20Sierra.abi, zEth.address, account0);

    try {
        const myCall = marketFactoryContract.populate("create_market", [
            zEth.address,
            zEth.address,
            usdc.address,
            "market_type",
        ]);
        const res = await marketFactoryContract.create_market(myCall.calldata);
        const marketTokenAddress = (
            (await account0.waitForTransaction(res.transaction_hash)) as any
        ).events[0].data[1];
        console.log("MARKET_TOKEN=" + marketTokenAddress);

        // Set constants for trade
        dataStoreContract.connect(account0);
        const dataCall5 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pool_amount_key(marketTokenAddress, zEth.address),
            2500000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx5 = await dataStoreContract.set_u256(dataCall5.calldata);
        await account0.waitForTransaction(setAddressTx5.transaction_hash);

        const dataCall6 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pool_amount_key(marketTokenAddress, usdc.address),
            2500000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx6 = await dataStoreContract.set_u256(dataCall6.calldata);
        await account0.waitForTransaction(setAddressTx6.transaction_hash);

        // Set Constants for long
        const dataCall7 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                "0x4896bc14d7c67b49131baf26724d3f29032ddd7539a3a8d88324140ea2de9b4",
                marketTokenAddress,
                true
            ),
            50000000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx7 = await dataStoreContract.set_u256(dataCall7.calldata);
        await account0.waitForTransaction(setAddressTx7.transaction_hash);

        const dataCall9 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                "0x425655404757d831905ce0c7aeb290f47c630d959038f3d087a009ba1236dbe",
                marketTokenAddress,
                true
            ),
            50000000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx9 = await dataStoreContract.set_u256(dataCall9.calldata);
        await account0.waitForTransaction(setAddressTx9.transaction_hash);

        const dataCall10 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_reserve_factor_key(marketTokenAddress, true),
            1000000000000000000n,
        ]);
        const setAddressTx10 = await dataStoreContract.set_u256(dataCall10.calldata);
        await account0.waitForTransaction(setAddressTx10.transaction_hash);

        const dataCall11 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_open_interest_reserve_factor_key(marketTokenAddress, true),
            1000000000000000000n,
        ]);
        const setAddressTx11 = await dataStoreContract.set_u256(dataCall11.calldata);
        await account0.waitForTransaction(setAddressTx11.transaction_hash);

        const dataCall12 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_open_interest_key(marketTokenAddress, zEth.address, true),
            1n,
        ]);
        const setAddressTx12 = await dataStoreContract.set_u256(dataCall12.calldata);
        await account0.waitForTransaction(setAddressTx12.transaction_hash);

        const dataCall8 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_open_interest_key(marketTokenAddress, true),
            1000000000000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx8 = await dataStoreContract.set_u256(dataCall8.calldata);
        await account0.waitForTransaction(setAddressTx8.transaction_hash);

        // Set constants for short
        const dataCall13 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                "0x4896bc14d7c67b49131baf26724d3f29032ddd7539a3a8d88324140ea2de9b4",
                marketTokenAddress,
                false
            ),
            50000000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx13 = await dataStoreContract.set_u256(dataCall13.calldata);
        await account0.waitForTransaction(setAddressTx13.transaction_hash);

        const dataCall14 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                "0x425655404757d831905ce0c7aeb290f47c630d959038f3d087a009ba1236dbe",
                marketTokenAddress,
                false
            ),
            50000000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx14 = await dataStoreContract.set_u256(dataCall14.calldata);
        await account0.waitForTransaction(setAddressTx14.transaction_hash);

        const dataCall15 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_reserve_factor_key(marketTokenAddress, false),
            1000000000000000000n,
        ]);
        const setAddressTx15 = await dataStoreContract.set_u256(dataCall15.calldata);
        await account0.waitForTransaction(setAddressTx15.transaction_hash);

        const dataCall16 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_open_interest_reserve_factor_key(marketTokenAddress, false),
            1000000000000000000n,
        ]);
        const setAddressTx16 = await dataStoreContract.set_u256(dataCall16.calldata);
        await account0.waitForTransaction(setAddressTx16.transaction_hash);

        const dataCall17 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_open_interest_key(marketTokenAddress, usdc.address, false),
            1n,
        ]);
        const setAddressTx17 = await dataStoreContract.set_u256(dataCall17.calldata);
        await account0.waitForTransaction(setAddressTx17.transaction_hash);

        const dataCall18 = dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_open_interest_key(marketTokenAddress, false),
            1000000000000000000000000000000000000000000000000000n,
        ]);
        const setAddressTx18 = await dataStoreContract.set_u256(dataCall18.calldata);
        await account0.waitForTransaction(setAddressTx18.transaction_hash);

        // Mint zETH to the market token
        const transferCall2 = zEthContract.populate("mint", [
            marketTokenAddress,
            uint256.bnToUint256(50000000000000000000000000000000000000n),
        ]);
        const transferTx2 = await zEthContract.mint(transferCall2.calldata);
        await account0.waitForTransaction(transferTx2.transaction_hash);

        // Mint USDC to the market token
        const transferUSDCCall = usdcContract.populate("mint", [
            marketTokenAddress,
            uint256.bnToUint256(25000000000000000000000000000000000000000n),
        ]);
        const transferUSDCTx = await usdcContract.mint(transferUSDCCall.calldata);
        await account0.waitForTransaction(transferUSDCTx.transaction_hash);

        console.log("All pre-settings done.");
    } catch (e) {
        console.log("Market already settled or error occurred:", e);
    }
}

create_market();
