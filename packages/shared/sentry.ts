import * as Sentry from "@sentry/bun";
import { createLogger } from "@freyr/shared/utils";

const logger = createLogger("Sentry");

interface SentryConfig {
    dsn: string;
    environment: string;
    tracesSampleRate?: number;
}

export const initSentry = (config: SentryConfig) => {
    if (!config.dsn) {
        logger.warn("Sentry DSN not provided - error tracking disabled");
        return;
    }
    Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        tracesSampleRate: config.tracesSampleRate || 1.0,
    });
};
