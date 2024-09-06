import { logger } from "../../shared/utils/logger";
import { PriceKeeper } from "./keepers/PriceKeeper";
import { PythPriceOracleService } from "./services/PythPriceOracleService";
import { getTokens, settingUp } from "../../shared/utils/utils";

import type { Token } from "../../shared/interfaces/Token";
import { OrderKeeper } from "./keepers/OrderKeeper";

async function index() {
    const { account, chainId, hermesUrl } = await settingUp();

    const tokens: Token[] = getTokens();

    const priceOracleService = new PythPriceOracleService(hermesUrl, tokens);

    // Stream Prices from Oracle
    new PriceKeeper(priceOracleService, account);
    priceOracleService.getPriceFromOracleStream();

    // Execute new Orders
    new OrderKeeper(priceOracleService, account, chainId);
}

// Start the main process
index();

logger.info("Keeper is running...");
