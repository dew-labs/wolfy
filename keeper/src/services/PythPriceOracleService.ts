import type { PythPriceFeed } from "../interfaces/PythPriceFeed";
import type { Token } from "../interfaces/Token";
import { HermesClient } from "@pythnetwork/hermes-client";
import { logger } from "keeper/utils/logger";
import EventEmitter from "events";

export class PythPriceOracleService extends EventEmitter {
    constructor(private readonly hermesUrl: string, private readonly tokens: Token[]) {
        super();
        this.connectToPythNetwork();
    }

    private async connectToPythNetwork(): Promise<void> {
        const hermesClient = new HermesClient(this.hermesUrl, {});

        const pythPriceIds = this.tokens.map((token) => token.pythPriceId);
        const eventSource = await hermesClient.getPriceUpdatesStream(pythPriceIds, {
            encoding: "hex",
            parsed: true,
            allowUnordered: false,
            benchmarksOnly: true,
        });

        eventSource.onmessage = async (event: any) => {
            const pythPriceFeeds: PythPriceFeed[] = JSON.parse(event.data).parsed;

            pythPriceFeeds.forEach(async (pythPriceFeed) => {
                this.handlePriceUpdate(pythPriceFeed);
            });
        };

        eventSource.onerror = (error: any) => {
            logger.error(`Hermes Client got error: ${error}`);
            eventSource.close();
        };
    }

    getTokenAddress(pythPriceId: string): string {
        const token = this.tokens.find((token) => token.pythPriceId === pythPriceId);
        if (!token) throw new Error("Not found token with pythPriceId");

        return token.address;
    }

    private handlePriceUpdate(pythPriceFeed: PythPriceFeed): void {
        const pythPriceId: string = "0x" + pythPriceFeed.id;
        const indexTokenAddress: string = this.getTokenAddress(pythPriceId);
        const oraclePrice: string = pythPriceFeed.price.price;
        const exponent: number = pythPriceFeed.price.expo;
        this.emit("oraclePricesUpdate", { indexTokenAddress, oraclePrice, exponent });
    }
}
