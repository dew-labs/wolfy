import pino from "pino";

export const logger = pino({
    level: "trace",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            colorizeObjects: true,
            ignore: "pid,hostname",
        },
    },
});
