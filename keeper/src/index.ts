import { createNanoEvents } from "nanoevents";

import { logger } from "@/shared/utils/logger";
import { getTokens, settingUp } from "@/shared/utils/utils";
import type { Events } from "@/shared/interfaces/Events";
import type { Token } from "@/shared/interfaces/Token";

import { OrderExecutionKeeper } from "@/keeper/src/keepers/OrderExecutionKeeper";
import { PriceKeeper } from "@/keeper/src/keepers/PriceKeeper";
import { PythPriceOracleService } from "@/keeper/src/services/PythPriceOracleService";

async function index() {
    const { account, chainId, hermesUrl } = await settingUp();

    const tokens: Token[] = getTokens();

    const priceOracleService = new PythPriceOracleService(hermesUrl, tokens);

    // TODO: define types
    const emitter = createNanoEvents<Events>();

    logger.info("Keeper is running ...");

    // Stream Prices from Oracle
    new PriceKeeper(priceOracleService, emitter);
    priceOracleService.getPriceFromOracleStream();

    // Execute new Orders
    new OrderExecutionKeeper(priceOracleService, account, chainId, emitter);
}

// Start the main process
index();
