import pc from "picocolors";

// TODO: improve logger

export const logger = {
    success: (message: string) => console.log(pc.green(message)),
    info: (message: string) => console.log(pc.blue(message)),
    error: (message: string) => console.error(pc.red(message)),
};
