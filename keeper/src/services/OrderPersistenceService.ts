import * as path from "path";
import fs from "node:fs";
import type { Order, OrdersMap } from "../../../shared/interfaces/Order";
import { json } from "starknet";

export class OrderPersistenceService {
    private readonly filePath: string;

    constructor() {
        this.filePath = path.resolve(__dirname, "../../data/orders.json");
    }

    async loadOrders(): Promise<OrdersMap> {
        return json.parse(fs.readFileSync(this.filePath).toString("ascii")) as OrdersMap;
    }

    saveOrder(order: Order, indexTokenAddress: string): void {
        fs.readFile(this.filePath, "utf8", (err: any, data: any) => {
            if (err) {
                console.error(`Error reading file from disk: ${err}`);
                return;
            }

            try {
                const ordersData = json.parse(data);

                if (!ordersData.hasOwnProperty(indexTokenAddress)) {
                    ordersData[indexTokenAddress] = {};
                }

                ordersData[indexTokenAddress][order.key] = order;

                fs.writeFile(this.filePath, json.stringify(ordersData), "utf8", (err) => {
                    if (err) {
                        console.error(`Error writing file to disk: ${err}`);
                    }
                });
            } catch (err) {
                console.error(`Error parsing JSON string: ${err}`);
            }
        });
    }

    deleteOrder(orderKey: string, indexTokenAddress: string): void {
        fs.readFile(this.filePath, "utf8", (err: any, data: any) => {
            if (err) {
                console.error(`Error reading file from disk: ${err}`);
                return;
            }

            try {
                const orderData = json.parse(data);

                delete orderData[indexTokenAddress][orderKey];

                fs.writeFile(this.filePath, json.stringify(orderData), "utf8", (err) => {
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
