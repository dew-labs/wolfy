import * as Sentry from "@sentry/bun";
import { initSentry } from "@freyr/shared/sentry";

import { createNanoEvents, type Emitter } from "nanoevents";

import type { Events } from "@freyr/shared/interfaces";
import { createLogger, LIQUIDATION_INTERVAL_MINUTES, settingUp } from "@freyr/shared/utils";

import { createDepositKeeper } from "./keepers/depositKeeper";
import { createLiquidationKeeper } from "./keepers/liquidationKeeper";
import { createOrderKeeper } from "./keepers/orderKeeper";
import { createPositionKeeper } from "./keepers/positionKeeper";
import { createPriceKeeper } from "./keepers/priceKeeper";
import { createWithdrawalKeeper } from "./keepers/withdrawalKeeper";

initSentry({
    dsn: process.env.KEEPER_SENTRY_DNS || "",
    environment: process.env.ENV || "dev",
    tracesSampleRate: 1.0,
});

const logger = createLogger("Keeper");
const emitter = createNanoEvents<Events>();

const runKeepers = async (emitter: Emitter<Events>) => {
    await settingUp();

    const { run: runPriceKeeper } = createPriceKeeper(emitter);
    const { run: runOrderKeeper } = createOrderKeeper(emitter);
    const { run: runPositionKeeper } = createPositionKeeper();
    const { run: runLiquidationKeeper } = createLiquidationKeeper(LIQUIDATION_INTERVAL_MINUTES);
    const { run: runDepositKeeper } = createDepositKeeper();
    const { run: runWithdrawalKeeper } = createWithdrawalKeeper();

    runPriceKeeper();
    runOrderKeeper();
    runPositionKeeper();
    runLiquidationKeeper();
    runDepositKeeper();
    runWithdrawalKeeper();

    logger.info("Keeper is running ...");
};

const index = async () => {
    try {
        await runKeepers(emitter);
    } catch (error) {
        Sentry.captureException(error);
        throw error;
    }
};

index();
