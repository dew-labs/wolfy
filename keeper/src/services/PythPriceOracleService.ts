import type { PythPriceFeed } from "../../../shared/interfaces/PythPriceFeed";
import type { Token } from "../../../shared/interfaces/Token";
import { HermesClient } from "@pythnetwork/hermes-client";
import { logger } from "../../../shared/utils/logger";
import EventEmitter from "events";
import { json } from "starknet";
import { expandDecimals } from "../../../shared/utils/utils";
import { USD_DECIMALS } from "../../../shared/utils/config";

export class PythPriceOracleService extends EventEmitter {
    private readonly hermesClient: HermesClient;
    public readonly oraclePrices: Record<string, bigint>;

    constructor(private readonly hermesUrl: string, private readonly tokens: Token[]) {
        super();
        this.hermesClient = new HermesClient(this.hermesUrl, {});
        this.oraclePrices = {};
        tokens.forEach((token) => (this.oraclePrices[token.address] = 0n));
    }

    async getPriceFromOracleStream(): Promise<void> {
        const pythPriceIds = this.tokens.map((token) => token.pythPriceId);
        const eventSource = await this.hermesClient.getPriceUpdatesStream(pythPriceIds, {
            encoding: "hex",
            parsed: true,
            allowUnordered: false,
            benchmarksOnly: true,
        });

        eventSource.onmessage = (event: any) => {
            const pythPriceFeeds: PythPriceFeed[] = json.parse(event.data).parsed;

            pythPriceFeeds.forEach((pythPriceFeed) => {
                this.handlePriceUpdate(pythPriceFeed);
            });
        };

        eventSource.onerror = (error: any) => {
            logger.error(`Hermes Client got error: ${error}`);
            // TODO: resubcribe when error
            eventSource.close();
        };
    }

    private handlePriceUpdate(pythPriceFeed: PythPriceFeed): void {
        const pythPriceId: string = "0x" + pythPriceFeed.id;
        const { address: indexTokenAddress, decimals: indexTokenDecimals }: Token =
            this.getTokenByPythPriceId(pythPriceId);

        const oraclePrice =
            expandDecimals(
                pythPriceFeed.price.price,
                USD_DECIMALS - Math.abs(pythPriceFeed.price.expo)
            ) / expandDecimals(1, indexTokenDecimals);
        this.oraclePrices[indexTokenAddress] = oraclePrice;
        this.emit("oraclePricesUpdate", { indexTokenAddress, oraclePrice });
    }

    private getTokenByPythPriceId(pythPriceId: string): Token {
        const token = this.tokens.find((token) => token.pythPriceId === pythPriceId);
        if (!token) throw new Error("Not found token address with PythPriceId");

        return token;
    }
}
