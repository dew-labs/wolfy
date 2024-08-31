import { readFile } from "fs/promises";

export async function readJsonFile<T>(filePath: string): Promise<T> {
    const data = await readFile(filePath, "utf8");

    return parseWithBigInt(data);
}

export function stringifyWithBigInt(obj: Object) {
    return JSON.stringify(
        obj,
        (_, value) => (typeof value === "bigint" ? value.toString() + "n" : value),
        4
    );
}

export function parseWithBigInt(jsonString: string) {
    return JSON.parse(jsonString, (_, value) => {
        if (typeof value === "string" && /^[0-9]+n$/.test(value)) {
            return BigInt(value.slice(0, -1));
        }
        return value;
    });
}
