import { HermesClient } from "@pythnetwork/hermes-client";
import { json } from "starknet";

import type { PythPriceFeed, Token } from "@freyr/shared/interfaces";
import {
    createLogger,
    expandDecimals,
    getNetworkConfig,
    getTokens,
    USD_DECIMALS,
} from "@freyr/shared/utils";

const logger = createLogger("PythPriceOracleService");

const tokens: Token[] = getTokens();

let oraclePrices: Record<string, bigint> = Object.fromEntries(
    tokens.map((token) => [token.address, 0n])
);

const pythPriceIds = tokens.map((token) => token.pythPriceId);

const handlePriceUpdate = (pythPriceFeed: PythPriceFeed): void => {
    const pythPriceId: string = "0x" + pythPriceFeed.id;
    tokens
        .filter((token) => token.pythPriceId === pythPriceId)
        .forEach((token) => {
            const oraclePrice =
                expandDecimals(
                    pythPriceFeed.price.price,
                    USD_DECIMALS - Math.abs(pythPriceFeed.price.expo)
                ) / expandDecimals(1, token.decimals);

            oraclePrices[token.address] = oraclePrice;
        });
};

const getPriceFromOracleStream = async (
    onUpdate: (address: string, price: bigint) => void
): Promise<void> => {
    const { hermesUrl } = getNetworkConfig();

    const hermesClient = new HermesClient(hermesUrl, {});

    const eventSource = await hermesClient.getPriceUpdatesStream(pythPriceIds, {
        encoding: "hex",
        parsed: true,
        allowUnordered: false,
        benchmarksOnly: true,
    });

    eventSource.onmessage = (event: unknown) => {
        try {
            if (
                typeof event !== "object" ||
                event === null ||
                !("data" in event) ||
                typeof event.data !== "string"
            )
                throw new Error("Invalid price data");

            const pythPriceFeeds: PythPriceFeed[] = json.parse(event.data).parsed;

            const oldPrices = { ...oraclePrices };
            pythPriceFeeds.forEach(handlePriceUpdate);

            // Notify about updates
            Object.entries(oraclePrices).forEach(([address, price]) => {
                if (price !== oldPrices[address]) {
                    onUpdate(address, price);
                }
            });
        } catch {
            // do nothing, we can still safe ignore the error
        }
    };

    eventSource.onerror = (error: unknown) => {
        logger.error(error, "Hermes Client got error");
        // TODO: resubscribe when error
        eventSource.close();
    };
};

const getOraclePrice = (tokenAddress: string): bigint => {
    const price = oraclePrices[tokenAddress];
    if (!price) {
        throw new Error(`Cannot find ${tokenAddress} token`);
    }
    return price;
};

export { getOraclePrice, getPriceFromOracleStream };
