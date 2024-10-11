import pino from "pino";

export const createLogger = (name: string) => {
    return pino({
        level: "trace",
        base: { name },
        timestamp: false,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                colorizeObjects: true,
                ignore: "pid,hostname",
            },
        },
    });
};
