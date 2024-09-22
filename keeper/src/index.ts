import { createNanoEvents, type Emitter } from "nanoevents";

import type { Events } from "@/shared/interfaces/Events";
import { LIQUIDATION_INTERVAL_MINUTES } from "@/shared/utils/config";
import { createLogger } from "@/shared/utils/logger";
import { settingUp } from "@/shared/utils/utils";

import { createLiquidationKeeper } from "./keepers/liquidationKeeper";
import { createOrderExecutionKeeper } from "./keepers/orderExecutionKeeper";
import { createPriceKeeper } from "./keepers/priceKeeper";
import { createDepositKeeper } from "./keepers/depositKeeper";

const logger = createLogger("Keeper");
const emitter = createNanoEvents<Events>();

const runKeepers = async (emitter: Emitter<Events>) => {
    await settingUp();

    const { run: runPriceKeeper } = createPriceKeeper(emitter);
    const { run: runOrderExecutionKeeper } = createOrderExecutionKeeper(emitter);
    const { run: runLiquidationKeeper } = createLiquidationKeeper(LIQUIDATION_INTERVAL_MINUTES);
    const { run: runDepositKeeper } = createDepositKeeper();

    runPriceKeeper();
    runOrderExecutionKeeper();
    runLiquidationKeeper();
    runDepositKeeper();

    logger.info("Keeper is running ...");
};

const index = async () => {
    await runKeepers(emitter);
};

index();
