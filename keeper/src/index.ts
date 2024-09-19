import { createNanoEvents, type Emitter } from "nanoevents";

import { logger } from "@/shared/utils/logger";
import type { Events } from "@/shared/interfaces/Events";

import { createPriceKeeper } from "./keepers/priceKeeper";
import { createOrderExecutionKeeper } from "./keepers/orderExecutionKeeper";
import { createLiquidationKeeper } from "./keepers/liquidationKeeper";
import { LIQUIDATION_INTERVAL_MINUTES } from "@/shared/utils/config";
import { settingUp } from "@/shared/utils/utils";

const emitter = createNanoEvents<Events>();

const runKeepers = async (emitter: Emitter<Events>) => {
    await settingUp();

    const { run: runPriceKeeper } = createPriceKeeper(emitter);
    const { run: runOrderExecutionKeeper } = createOrderExecutionKeeper(emitter);
    const { run: runLiquidationKeeper } = createLiquidationKeeper(LIQUIDATION_INTERVAL_MINUTES);

    runPriceKeeper();
    runOrderExecutionKeeper();
    runLiquidationKeeper();

    logger.info("Keeper is running ...");
};

const index = async () => {
    await runKeepers(emitter);
};

index();
