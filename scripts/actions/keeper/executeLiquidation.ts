import {
    createAsker,
    expandDecimals,
    getContracts,
    getDataStoreContract,
    getSetPriceParams,
    settingUp,
    USD_DECIMALS,
} from "@freyr/shared/utils";
import {
    createWolfyContract,
    LiquidationHandlerABI,
    ReaderABI,
    WolfyContract,
    toStarknetHexString,
    createTokenContract,
} from "wolfy-sdk";
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

    const longToken = toStarknetHexString(market.long_token);
    const shortToken = toStarknetHexString(market.short_token);

    const longTokenContract = createTokenContract(chainId, longToken);
    const longTokenDecimals = await longTokenContract.decimals();

    const shortTokenContract = createTokenContract(chainId, shortToken);
    const shortTokenDecimals = await shortTokenContract.decimals();

    const longTokenSymbol = shortString.decodeShortString(String(await longTokenContract.symbol()));
    const shortTokenSymbol = shortString.decodeShortString(
        String(await shortTokenContract.symbol())
    );

    console.log(`Market: ${longTokenSymbol}/${shortTokenSymbol}`);

    const readerContract = createWolfyContract(chainId, WolfyContract.Reader, ReaderABI);

    const longTokenPriceReadable = (await ask("Long token price (usd) (default to 3500)")) || 3500;

    const shortTokenPriceReadable = (await ask("Short token price (usd) (default to 1)")) || 1;

    const longTokenPrice =
        expandDecimals(longTokenPriceReadable, USD_DECIMALS) / expandDecimals(1, longTokenDecimals);

    const shortTokenPrice =
        expandDecimals(shortTokenPriceReadable, USD_DECIMALS) /
        expandDecimals(1, shortTokenDecimals);

    const indexTokenPrice = longTokenPrice;

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

    const liquidationHandlerContract = createWolfyContract(
        chainId,
        WolfyContract.LiquidationHandler,
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
