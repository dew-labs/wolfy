import {
    createAsker,
    getContracts,
    getDataStoreContract,
    getSetPriceParams,
    settingUp,
} from "@freyr/shared/utils";
import {
    createSatoruContract,
    LiquidationHandlerABI,
    ReaderABI,
    SatoruContract,
    toStarknetHexString,
} from "satoru-sdk";
import { shortString } from "starknet";

async function executeLiquidation() {
    // get order key from DataStore.get_account_order_keys
    const { ask, doneAsking } = createAsker();

    const { account, chainId } = await settingUp();

    const dataStoreContract = getDataStoreContract(chainId, account);

    const contracts = getContracts();

    const referralStorageAddress = contracts.ReferralStorage;

    if (!referralStorageAddress) throw new Error("ReferralStorage contract required");

    let positionKey = await ask("Enter position key");

    if (!positionKey) throw new Error("Position key is required");

    const position = await dataStoreContract.get_position(positionKey);

    const market = await dataStoreContract.get_market(toStarknetHexString(position.market));

    const readerContract = createSatoruContract(chainId, SatoruContract.Reader, ReaderABI);

    const indexTokenPrice = 2000_000000000000n; // 30 (USD_DECIMALS) - 18 decimals (indexToken decimals)
    const longTokenPrice = indexTokenPrice;
    const shortTokenPrice = 1_000000000000n;

    const { 0: shouldBeLiquidated, 1: rawReason } = await readerContract.is_position_liquidable(
        {
            contract_address: dataStoreContract.address,
        },
        {
            contract_address: referralStorageAddress,
        },
        position,
        market,
        {
            index_token_price: {
                min: indexTokenPrice,
                max: indexTokenPrice,
            },
            long_token_price: {
                min: longTokenPrice,
                max: longTokenPrice,
            },
            short_token_price: {
                min: shortTokenPrice,
                max: shortTokenPrice,
            },
        },
        true
    );

    const reason =
        rawReason && rawReason !== true && typeof rawReason !== "object"
            ? shortString.decodeShortString(toStarknetHexString(rawReason))
            : "no reason";

    console.log("Should be liquidated:", shouldBeLiquidated);
    console.log("Because:", reason);

    // -----------------------------------------------------------------------------------------------------------------

    const liquidationHandlerContract = createSatoruContract(
        chainId,
        SatoruContract.LiquidationHandler,
        LiquidationHandlerABI,
        account
    );

    const priceParams = await getSetPriceParams(account, [
        [market.index_token, indexTokenPrice],
        [market.long_token, longTokenPrice],
        [market.short_token, shortTokenPrice],
    ]);

    console.log(priceParams);

    await liquidationHandlerContract.execute_liquidation(
        position.account,
        position.market,
        position.collateral_token,
        position.is_long,
        priceParams
    );

    console.log("Liquidation executed");

    doneAsking();
}

executeLiquidation();
