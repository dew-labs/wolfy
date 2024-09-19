import * as path from "path";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { logger } from "@/shared/utils/logger";
import { PositionsSchema, type Position } from "@/shared/interfaces/Position";
import {
    readFile,
    writeFile,
    parseData,
    stringifyData,
    ensureFileExists,
} from "@/shared/utils/file";

const filePath = path.resolve(__dirname, "../../data/positions.json");
const validator = TypeCompiler.Compile(PositionsSchema);

const validatePositions = (data: unknown): Position[] => {
    if (Array.isArray(data) && validator.Check(data)) {
        return data;
    }
    throw new Error("Invalid positions format");
};

export const loadPositions = (): Position[] => {
    try {
        ensureFileExists(filePath, stringifyData([]));
        const data = readFile(filePath);
        const parsedData = parseData(data);
        return validatePositions(parsedData);
    } catch (error) {
        logger.error(error, "Error loading positions");
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
        logger.debug(`Position saved: ${newPosition.key}`);
    } catch (error) {
        logger.error(error, `Error saving position: ${newPosition.key}`);
    }
};

export const removePosition = (positionKey: string): void => {
    try {
        const positions = loadPositions();
        const updatedPositions = positions.filter((position) => position.key !== positionKey);

        if (positions.length === updatedPositions.length) {
            logger.warn(`Position with key ${positionKey} not found`);
            return;
        }

        writeFile(filePath, stringifyData(updatedPositions));
        logger.debug(`Position removed: ${positionKey}`);
    } catch (error) {
        logger.error(error, `Error removing position: ${positionKey}`);
    }
};

export const updatePosition = (updatedPosition: Position): void => {
    try {
        const positions = loadPositions();
        const newPositions = positions.map((p) =>
            p.key === updatedPosition.key ? updatedPosition : p
        );
        writeFile(filePath, stringifyData(newPositions));
        logger.debug(`Position updated: ${updatedPosition.key}`);
    } catch (error) {
        logger.error(error, `Error updating position: ${updatedPosition.key}`);
    }
};

export const getPosition = (positionKey: string): Position | undefined => {
    try {
        const positions = loadPositions();
        return positions.find((position) => position.key === positionKey);
    } catch (error) {
        logger.error(error, `Error getting position: ${positionKey}`);
        return undefined;
    }
};
