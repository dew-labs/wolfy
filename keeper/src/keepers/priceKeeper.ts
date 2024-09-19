import { getPriceFromOracleStream } from "../services/pythPriceOracleService";
import { type Emitter } from "nanoevents";
import { EventHandlerTypes, type Events } from "@/shared/interfaces/Events";

export const createPriceKeeper = (emitter: Emitter<Events>) => {
    const handlePriceUpdate = (indexTokenAddress: string, oraclePrice: bigint) => {
        emitter.emit(EventHandlerTypes.priceChanged, indexTokenAddress, oraclePrice);
    };

    const run = async () => {
        console.log("🚀 ~ run ~ run:");
        await getPriceFromOracleStream(handlePriceUpdate);
    };

    return { run };
};
