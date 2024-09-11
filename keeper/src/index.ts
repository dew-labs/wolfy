import { createNanoEvents } from "nanoevents";

import { logger } from "@/shared/utils/logger";
import { getTokens, settingUp } from "@/shared/utils/utils";
import type { Events } from "@/shared/interfaces/Events";
import type { Token } from "@/shared/interfaces/Token";

import { OrderExecutionKeeper } from "./keepers/OrderExecutionKeeper";
import { PriceKeeper } from "./keepers/PriceKeeper";
import { PythPriceOracleService } from "./services/PythPriceOracleService";
import { startLiquidationKeeper } from "./keepers/liquidationKeeper";

async function index() {
    const { account, chainId, hermesUrl } = await settingUp();

    const tokens: Token[] = getTokens();

    const priceOracleService = new PythPriceOracleService(hermesUrl, tokens);

    const emitter = createNanoEvents<Events>();

    logger.info("Keeper is running ...");

    new PriceKeeper(priceOracleService, emitter);
    priceOracleService.getPriceFromOracleStream();

    new OrderExecutionKeeper(priceOracleService, account, chainId, emitter);

    startLiquidationKeeper(5);
}

// Start the main process
index();
