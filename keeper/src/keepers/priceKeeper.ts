import { type Emitter } from "nanoevents";

import { EventHandlerTypes, type Events } from "@/shared/interfaces/Events";

import { getPriceFromOracleStream } from "../services/pythPriceOracleService";

export const createPriceKeeper = (emitter: Emitter<Events>) => {
    const handlePriceUpdate = (indexTokenAddress: string, oraclePrice: bigint) => {
        emitter.emit(EventHandlerTypes.PriceChanged, indexTokenAddress, oraclePrice);
    };

    const run = async () => {
        await getPriceFromOracleStream(handlePriceUpdate);
    };

    return { run };
};
