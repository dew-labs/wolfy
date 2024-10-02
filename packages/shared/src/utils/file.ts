import fs from "node:fs";
import * as devalue from "devalue";

export const readFile = (path: string): string => {
    try {
        return fs.readFileSync(path, "utf8");
    } catch (error) {
        throw new Error(`Error reading file: ${error}`);
    }
};

export const writeFile = (path: string, data: string): void => {
    try {
        fs.writeFileSync(path, data, "utf8");
    } catch (error) {
        throw new Error(`Error writing file: ${error}`);
    }
};

export const parseData = (data: string): unknown => {
    try {
        return devalue.parse(data);
    } catch (error) {
        throw new Error(`Error parsing data: ${error}`);
    }
};

export const stringifyData = (data: unknown): string => {
    try {
        return devalue.stringify(data);
    } catch (error) {
        throw new Error(`Error stringifying data: ${error}`);
    }
};

export const ensureFileExists = (path: string, defaultContent: string): void => {
    const directory = path.substring(0, path.lastIndexOf("/"));
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
    if (!fs.existsSync(path)) {
        writeFile(path, defaultContent);
    }
};
