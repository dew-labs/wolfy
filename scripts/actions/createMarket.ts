import { shortString, uint256, ec } from "starknet";
import {
    ensureDeployed,
    ensureRole,
    executeAndWait,
    getContracts,
    getKey,
    newContract,
    settingUp,
} from "../utils";

import MarketFactoryABI from "../../artifacts/MarketFactoryABI";
import DataStoreABI from "../../artifacts/DataStoreABI";
import RoleStoreABI from "../../artifacts/RoleStoreABI";
import ERC20ABI from "../../artifacts/ERC20ABI";

async function create_market() {
    const { account } = await settingUp();
    const contracts = getContracts();

    const roleStoreContract = newContract(RoleStoreABI, contracts.ROLE_STORE, account);

    console.log("Granting roles...");

    await ensureRole(roleStoreContract, "MarketFactory", contracts.MARKET_FACTORY, "CONTROLLER");

    await ensureRole(roleStoreContract, "MarketFactory", contracts.MARKET_FACTORY, "MARKET_KEEPER");

    await ensureRole(roleStoreContract, "DepositHandler", contracts.DEPOSIT_HANDLER, "CONTROLLER");

    await ensureRole(roleStoreContract, "OrderHandler", contracts.ORDER_HANDLER, "CONTROLLER");

    console.log("Roles granted. Creating Market...");

    // BEGIN deploy tokens

    // deploy index token, long token
    const zEth = await ensureDeployed(account, contracts.zETH, "ERC20", {
        name: "zEthereum",
        symbol: "zETH",
        initial_supply: 1000000,
        recipient: account.address,
    });

    // deploy short token
    const usdc = await ensureDeployed(account, contracts.USDC, "ERC20", {
        name: "USDC",
        symbol: "USDC",
        initial_supply: 1000000,
        recipient: account.address,
    });

    const usdcContract = newContract(ERC20ABI, usdc.address, account);
    const zEthContract = newContract(ERC20ABI, zEth.address, account);

    // END deploy tokens

    const marketFactoryContract = newContract(MarketFactoryABI, contracts.MARKET_FACTORY, account);

    // BEGIN create market

    let marketTokenAddress = contracts.MARKET_TOKEN;

    if (!marketTokenAddress) {
        try {
            // create market
            const rec = await executeAndWait(
                marketFactoryContract.populate("create_market", [
                    zEth.address,
                    zEth.address,
                    usdc.address,
                    "market_type",
                ]),
                account
            );

            if (rec.isSuccess()) {
                marketTokenAddress = rec.events[0].data[1];
                console.log("MARKET_TOKEN=" + marketTokenAddress);
            } else {
                throw new Error("Failed to create market");
            }
        } catch (error) {
            console.log("Market already settled or error occurred:", error);
        }
    }

    // END create market

    const dataStoreContract = newContract(DataStoreABI, contracts.DATA_STORE, account);

    // set fee token
    await executeAndWait(
        dataStoreContract.populate("set_address", [getKey("FEE_TOKEN"), zEth.address]),
        account
    );

    // set max swap path length
    await executeAndWait(
        dataStoreContract.populate("set_u256", [getKey("MAX_SWAP_PATH_LENGTH"), 5]),
        account
    );

    // Set constants for trade
    // set max pool for long token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pool_amount_key(marketTokenAddress, zEth.address),
            uint256.bnToUint256(5000000000000000000000000000000000000000000),
        ]),
        account
    );

    // set max pool for short token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pool_amount_key(marketTokenAddress, usdc.address),
            uint256.bnToUint256(2500000000000000000000000000000000000000000000),
        ]),
        account
    );

    // Set Constants for long

    const factorForDeposits = getKey("MAX_PNL_FACTOR_FOR_DEPOSITS");
    const factorForWithdrawals = getKey("MAX_PNL_FACT_FOR_WITHDRAWALS");

    // MAX_PNL_FACTOR_FOR_DEPOSITS for long token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                factorForDeposits,
                marketTokenAddress,
                true
            ),
            uint256.bnToUint256(50000000000000000000000000000000000000000000000),
        ]),
        account
    );

    // MAX_PNL_FACT_FOR_WITHDRAWALS for long token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                factorForWithdrawals,
                marketTokenAddress,
                true
            ),
            uint256.bnToUint256(50000000000000000000000000000000000000000000000),
        ]),
        account
    );

    // reserve factor for long token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_reserve_factor_key(marketTokenAddress, true),
            uint256.bnToUint256(1000000000000000000),
        ]),
        account
    );

    // open interest reserve factor for long token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_open_interest_reserve_factor_key(marketTokenAddress, true),
            uint256.bnToUint256(1000000000000000000),
        ]),
        account
    );

    // Set constants for short
    // MAX_PNL_FACTOR_FOR_DEPOSITS for short token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                factorForDeposits,
                marketTokenAddress,
                false
            ),
            uint256.bnToUint256(50000000000000000000000000000000000000000000000),
        ]),
        account
    );

    // MAX_PNL_FACT_FOR_WITHDRAWALS for short token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                factorForWithdrawals,
                marketTokenAddress,
                false
            ),
            uint256.bnToUint256(50000000000000000000000000000000000000000000000),
        ]),
        account
    );

    // reserve factor for short token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_reserve_factor_key(marketTokenAddress, false),
            uint256.bnToUint256(1000000000000000000),
        ]),
        account
    );

    // open interest reserve factor for short token
    await executeAndWait(
        dataStoreContract.populate("set_u256", [
            await dataStoreContract.get_open_interest_reserve_factor_key(marketTokenAddress, false),
            uint256.bnToUint256(1000000000000000000),
        ]),
        account
    );

    // BEGIN Fill the pool, this is the initial amount that depositors will put in the pool
    // Mint zETH to the market token
    await executeAndWait(
        zEthContract.populate("mint", [
            marketTokenAddress,
            uint256.bnToUint256(50000000000000000000000000000000000000),
        ]),
        account
    );

    // Mint USDC to the market token
    await executeAndWait(
        usdcContract.populate("mint", [
            marketTokenAddress,
            uint256.bnToUint256(25000000000000000000000000000000000000000),
        ]),
        account
    );
    // END Fill the pool

    // BEGIN Fill the account, this help our account have a initial balance
    // Mint zETH to account
    await executeAndWait(
        zEthContract.populate("mint", [account.address, uint256.bnToUint256(9999999999999000000)]),
        account
    );

    // Mint USDC to account
    await executeAndWait(
        usdcContract.populate("mint", [
            account.address,
            uint256.bnToUint256(49999999999999999000000),
        ]),
        account
    );
    // EMD Fill the account

    console.log("All pre-settings done.");
}

create_market();
