import { CairoUint256, num, shortString } from "starknet";
import { getKey, ask, settingUp, doneAsking } from "../../utils";
import {
    createCall,
    createSatoruContract,
    createTokenContract,
    DataStoreABI,
    executeAndWait,
    MarketFactoryABI,
    SatoruContract,
} from "satoru-sdk";

async function create_market() {
    const { account, chainId } = await settingUp();

    const indexTokenAddress = await ask("Enter index token address");
    const longTokenAddress =
        (await ask("Enter long token address  (default to index token)")) || indexTokenAddress;
    const shortTokenAddress = await ask("Enter short token address");

    const indexTokenContract = createTokenContract(chainId, indexTokenAddress, account);
    const longTokenContract = createTokenContract(chainId, longTokenAddress, account);
    const shortTokenContract = createTokenContract(chainId, shortTokenAddress, account);

    const indexTokenName = shortString.decodeShortString(
        num.toHex(await indexTokenContract.symbol())
    );
    const longTokenName = shortString.decodeShortString(
        num.toHex(await longTokenContract.symbol())
    );
    const shortTokenName = shortString.decodeShortString(
        num.toHex(await shortTokenContract.symbol())
    );

    console.log("Index token:", indexTokenName);
    console.log("Long token:", longTokenName);
    console.log("Short token:", shortTokenName);

    const marketFactoryContract = createSatoruContract(
        chainId,
        SatoruContract.MarketFactory,
        MarketFactoryABI,
        account
    );

    // BEGIN create market

    let marketTokenAddress;

    try {
        // create market
        const rec = await executeAndWait(
            chainId,
            createCall(marketFactoryContract, "create_market", [
                indexTokenAddress,
                longTokenAddress,
                shortTokenAddress,
                "market_type",
            ]),
            account
        );

        if (rec.isSuccess()) {
            marketTokenAddress = rec.events[0]?.data[1];
            console.log("MARKET_TOKEN=" + marketTokenAddress);
        } else {
            throw new Error("Failed to create market");
        }
    } catch (error) {
        throw new Error("Market already settled or error occurred:", { cause: error });
    }

    if (!marketTokenAddress) return;

    // END create market

    const dataStoreContract = createSatoruContract(chainId, SatoruContract.DataStore, DataStoreABI);

    // Set constants for trade
    // set max pool for long token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_max_pool_amount_key(marketTokenAddress, longTokenAddress),
            new CairoUint256(5000000000000000000000000000000000000000000),
        ]),
        account
    );

    // set max pool for short token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_max_pool_amount_key(marketTokenAddress, shortTokenAddress),
            new CairoUint256(2500000000000000000000000000000000000000000000),
        ]),
        account
    );

    // Set Constants for long

    const factorForDeposits = getKey("MAX_PNL_FACTOR_FOR_DEPOSITS");
    const factorForWithdrawals = getKey("MAX_PNL_FACT_FOR_WITHDRAWALS");

    // MAX_PNL_FACTOR_FOR_DEPOSITS for long token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                factorForDeposits,
                marketTokenAddress,
                true
            ),
            new CairoUint256(50000000000000000000000000000000000000000000000),
        ]),
        account
    );

    // MAX_PNL_FACT_FOR_WITHDRAWALS for long token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                factorForWithdrawals,
                marketTokenAddress,
                true
            ),
            new CairoUint256(50000000000000000000000000000000000000000000000),
        ]),
        account
    );

    // reserve factor for long token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_reserve_factor_key(marketTokenAddress, true),
            new CairoUint256(1000000000000000000),
        ]),
        account
    );

    // open interest reserve factor for long token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_open_interest_reserve_factor_key(marketTokenAddress, true),
            new CairoUint256(1000000000000000000),
        ]),
        account
    );

    // Set constants for short
    // MAX_PNL_FACTOR_FOR_DEPOSITS for short token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                factorForDeposits,
                marketTokenAddress,
                false
            ),
            new CairoUint256(50000000000000000000000000000000000000000000000),
        ]),
        account
    );

    // MAX_PNL_FACT_FOR_WITHDRAWALS for short token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_max_pnl_factor_key(
                factorForWithdrawals,
                marketTokenAddress,
                false
            ),
            new CairoUint256(50000000000000000000000000000000000000000000000),
        ]),
        account
    );

    // reserve factor for short token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_reserve_factor_key(marketTokenAddress, false),
            new CairoUint256(1000000000000000000),
        ]),
        account
    );

    // open interest reserve factor for short token
    await executeAndWait(
        chainId,
        createCall(dataStoreContract, "set_u256", [
            await dataStoreContract.get_open_interest_reserve_factor_key(marketTokenAddress, false),
            new CairoUint256(1000000000000000000),
        ]),
        account
    );

    console.log("All pre-settings done.");

    // // BEGIN Fill the pool, this is the initial amount that depositors will put in the pool
    // const longTokenContract = createTokenContract(chainId, longTokenAddress, account);
    // const shortTokenContract = createTokenContract(chainId, shortTokenAddress, account);
    // // Mint zETH to the market token
    // await executeAndWait(
    //     chainId,
    //     createCall(longTokenContract, "mint", [
    //         marketTokenAddress,
    //         new CairoUint256(50000000000000000000000000000000000000),
    //     ]),
    //     account
    // );

    // // Mint USDC to the market token
    // await executeAndWait(
    //     chainId,
    //     createCall(shortTokenContract, "mint", [
    //         marketTokenAddress,
    //         new CairoUint256(25000000000000000000000000000000000000000),
    //     ]),
    //     account
    // );
    // // END Fill the pool
    doneAsking();
}

await create_market();
