import { json } from "starknet";
import { logger } from "../../shared/utils/logger";
import { PriceKeeper } from "./keepers/PriceKeeper";
import { PythPriceOracleService } from "./services/PythPriceOracleService";
import { settingUp } from "../../shared/utils/utils";

import fs from "node:fs";
import setup from "../../shared/utils/setup";
import type { Token } from "../../shared/interfaces/Token";
import { OrderKeeper } from "./keepers/OrderKeeper";

async function index() {
    setup();

    const { net, account, chainId, hermesUrl } = await settingUp();

    const tokens: Token[] = json.parse(fs.readFileSync(`./tokens.${net}.json`).toString("ascii"));

    const priceOracleService = new PythPriceOracleService(hermesUrl, tokens);

    // Stream Prices from Oracle
    new PriceKeeper(priceOracleService, account);
    priceOracleService.getPriceFromOracleStream();

    // Execute new Orders
    const orderKeeper = new OrderKeeper(priceOracleService, account, chainId);
    orderKeeper.subcribeOrderCreatedEvent();
}

// Start the main process
index();

logger.info("Keeper is running...");
