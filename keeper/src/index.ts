import { logger } from "@/shared/utils/logger";
import { PriceKeeper } from "./keepers/PriceKeeper";
import { PythPriceOracleService } from "./services/PythPriceOracleService";
import { getTokens, settingUp } from "@/shared/utils/utils";

import type { Token } from "@/shared/interfaces/Token";
import { OrderKeeper } from "./keepers/OrderKeeper";
import { createNanoEvents, type Emitter } from "nanoevents";

async function index() {
    const { account, chainId, hermesUrl } = await settingUp();

    const tokens: Token[] = getTokens();

    const priceOracleService = new PythPriceOracleService(hermesUrl, tokens);

    const emitter: Emitter = createNanoEvents();

    logger.info("Keeper is running ...");

    // Stream Prices from Oracle
    new PriceKeeper(priceOracleService, emitter);
    priceOracleService.getPriceFromOracleStream();

    // Execute new Orders
    new OrderKeeper(priceOracleService, account, chainId, emitter);
}

// Start the main process
index();
