import * as path from "path";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { createLogger } from "@/shared/utils/logger";
import { PositionsSchema, type Position } from "@/shared/interfaces/Position";
import {
    readFile,
    writeFile,
    parseData,
    stringifyData,
    ensureFileExists,
} from "@/shared/utils/file";

const logger = createLogger("PositionPersistenceService");

const filePath = path.resolve(__dirname, "../../data/positions.json");
const validator = TypeCompiler.Compile(PositionsSchema);

const validatePositions = (data: unknown): Position[] => {
    if (Array.isArray(data) && validator.Check(data)) {
        return data;
    }
    throw new Error("Positions: Invalid format in JSON");
};

export const loadPositions = (): Position[] => {
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

export const savePosition = (newPosition: Position): void => {
    try {
        const positions = loadPositions();
        const existingIndex = positions.findIndex((position) => position.key === newPosition.key);
        const updatedPositions =
            existingIndex === -1
                ? [...positions, newPosition]
                : positions.map((position) =>
                      position.key === newPosition.key ? newPosition : position
                  );
        writeFile(filePath, stringifyData(updatedPositions));
        logger.debug(`Position ${newPosition.key}: Saved to JSON`);
    } catch (error) {
        logger.error(error, `Position ${newPosition.key}: Failed to save to JSON`);
    }
};

export const removePosition = (positionKey: string): void => {
    try {
        const positions = loadPositions();
        const updatedPositions = positions.filter((position) => position.key !== positionKey);

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

export const updatePosition = (updatedPosition: Position): void => {
    try {
        const positions = loadPositions();
        const newPositions = positions.map((p) =>
            p.key === updatedPosition.key ? updatedPosition : p
        );
        writeFile(filePath, stringifyData(newPositions));
        logger.debug(`Position ${updatedPosition.key}: Updated to JSON`);
    } catch (error) {
        logger.error(error, `Position ${updatedPosition.key}: Failed to update to JSON`);
    }
};

export const getPosition = (positionKey: string): Position | undefined => {
    try {
        const positions = loadPositions();
        return positions.find((position) => position.key === positionKey);
    } catch (error) {
        logger.error(error, `Position ${positionKey}: Failed to get from JSON`);
        return undefined;
    }
};
