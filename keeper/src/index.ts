import { createNanoEvents, type Emitter } from "nanoevents";

import type { Events } from "@wolfy/shared/interfaces";
import { createLogger, LIQUIDATION_INTERVAL_MINUTES, settingUp } from "@wolfy/shared/utils";

import { createDepositKeeper } from "./keepers/depositKeeper";
import { createLiquidationKeeper } from "./keepers/liquidationKeeper";
import { createOrderKeeper } from "./keepers/orderKeeper";
import { createPositionKeeper } from "./keepers/positionKeeper";
import { createPriceKeeper } from "./keepers/priceKeeper";

const logger = createLogger("Keeper");
const emitter = createNanoEvents<Events>();

const runKeepers = async (emitter: Emitter<Events>) => {
    await settingUp();

    const { run: runPriceKeeper } = createPriceKeeper(emitter);
    const { run: runOrderKeeper } = createOrderKeeper(emitter);
    const { run: runPositionKeeper } = createPositionKeeper();
    const { run: runLiquidationKeeper } = createLiquidationKeeper(LIQUIDATION_INTERVAL_MINUTES);
    const { run: runDepositKeeper } = createDepositKeeper();

    runPriceKeeper();
    runOrderKeeper();
    runPositionKeeper();
    runLiquidationKeeper();
    runDepositKeeper();

    logger.info("Keeper is running ...");
};

const index = async () => {
    await runKeepers(emitter);
};

index();
