import pino from "pino";

export const createLogger = (name: string) => {
    return pino({
        level: "trace",
        base: { name },
        timestamp: pino.stdTimeFunctions.isoTime,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                colorizeObjects: true,
                ignore: "pid,hostname",
                translateTime: "SYS:standard",
            },
        },
    });
};
