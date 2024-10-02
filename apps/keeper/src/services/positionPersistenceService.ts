import { TypeCompiler } from "@sinclair/typebox/compiler";
import * as path from "path";

import { Type } from "@sinclair/typebox";
import {
    createLogger,
    ensureFileExists,
    parseData,
    readFile,
    stringifyData,
    writeFile,
} from "@freyr/shared/utils";

const logger = createLogger("PositionPersistenceService");

const filePath = path.resolve(__dirname, "../../data/positions.json");

const validator = TypeCompiler.Compile(Type.Array(Type.String()));

const validatePositions = (data: unknown): string[] => {
    if (!validator.Check(data)) {
        throw new Error("Positions: Invalid format in JSON");
    }

    return data;
};

export const loadPositions = (): string[] => {
    try {
        ensureFileExists(filePath, stringifyData([]));
        const data = readFile(filePath);
        const parsedData = parseData(data);
        return validatePositions(parsedData);
    } catch (error) {
        logger.error(error, "Positions: Failed to load from JSON");
        return [];
    }
};

export const savePosition = (positionKey: string): void => {
    try {
        const positions = loadPositions();
        const updatedPositions = [...positions, positionKey];
        writeFile(filePath, stringifyData(updatedPositions));
        logger.debug(`Position ${positionKey}: Saved to JSON`);
    } catch (error) {
        logger.error(error, `Position ${positionKey}: Failed to save to JSON`);
    }
};

export const removePosition = (positionKey: string): void => {
    try {
        const positions = loadPositions();
        const updatedPositions = positions.filter((key) => key !== positionKey);

        if (positions.length === updatedPositions.length) {
            logger.warn(`Position ${positionKey}: Not found in JSON`);
            return;
        }

        writeFile(filePath, stringifyData(updatedPositions));
        logger.debug(`Position ${positionKey}: Removed from JSON`);
    } catch (error) {
        logger.error(error, `Position ${positionKey}: Failed to remove from JSON`);
    }
};

export const getPosition = (positionKey: string): string | undefined => {
    const positions = loadPositions();
    return positions.find((key) => key === positionKey);
};
