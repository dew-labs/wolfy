import * as Sentry from "@sentry/bun";

interface SentryConfig {
    dsn: string;
    environment: string;
    tracesSampleRate?: number;
}

export const initSentry = (config: SentryConfig) => {
    Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        tracesSampleRate: config.tracesSampleRate || 1.0,
    });
};
