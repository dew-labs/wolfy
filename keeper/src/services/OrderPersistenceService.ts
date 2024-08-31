import { parseWithBigInt, readJsonFile, stringifyWithBigInt } from "keeper/utils/json";
import * as path from "path";
import fs from "node:fs";
import type { Order, OrdersMap } from "../interfaces/Order";

export class OrderPersistenceService {
    private readonly filePath: string;

    constructor() {
        this.filePath = path.resolve(__dirname, "../../data/orders.json");
    }

    async loadOrders(): Promise<OrdersMap> {
        return readJsonFile(this.filePath);
    }

    saveOrder(order: Order, indexTokenAddress: string): void {
        fs.readFile(this.filePath, "utf8", (err: any, data: any) => {
            if (err) {
                console.error(`Error reading file from disk: ${err}`);
                return;
            }

            try {
                const jsonData = parseWithBigInt(data);

                if (!jsonData.hasOwnProperty(indexTokenAddress)) {
                    jsonData[indexTokenAddress] = {};
                }

                jsonData[indexTokenAddress][order.key] = order;

                fs.writeFile(this.filePath, stringifyWithBigInt(jsonData), "utf8", (err) => {
                    if (err) {
                        console.error(`Error writing file to disk: ${err}`);
                    }
                });
            } catch (err) {
                console.error(`Error parsing JSON string: ${err}`);
            }
        });
    }
}
