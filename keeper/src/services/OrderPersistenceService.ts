import * as path from "path";
import fs from "node:fs";
import type { Order } from "@shared/interfaces/Order";
import { json } from "starknet";

export class OrderPersistenceService {
    private readonly filePath: string;

    constructor() {
        this.filePath = path.resolve(__dirname, "../../data/orders.json");
    }

    loadOrders() {
        // TODO: parse data using typebox instead of type assertions
        return json.parse(fs.readFileSync(this.filePath).toString("ascii")) as Record<
            string,
            Order[]
        >;
    }

    saveOrder(order: Order, indexTokenAddress: string): void {
        // TODO: reuse loadOrders
        fs.readFile(this.filePath, "utf8", (err: unknown, data: unknown) => {
            if (err) {
                console.error(`Error reading file from disk: ${err}`);
                return;
            }

            if (typeof data !== "string") throw new Error("Invalid file content");

            try {
                const ordersData = json.parse(data) as Record<string, Order[]>;

                if (!ordersData.hasOwnProperty(indexTokenAddress)) {
                    ordersData[indexTokenAddress] = [];
                    ordersData[indexTokenAddress].push(order);
                }

                fs.writeFile(this.filePath, json.stringify(ordersData, null, 2), "utf8", (err) => {
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
        // TODO: reuse loadOrders
        fs.readFile(this.filePath, "utf8", (err: unknown, data: unknown) => {
            if (err) {
                console.error(`Error reading file from disk: ${err}`);
                return;
            }

            if (typeof data !== "string") throw new Error("Invalid file content");

            try {
                const orderData = json.parse(data) as Record<string, Order[]>;
                const orders: Order[] | undefined = orderData[indexTokenAddress];

                if (!orders) {
                    throw new Error(`Cannot find the Order with index token ${indexTokenAddress}`);
                }
                const newOrders = orders.filter((order) => order.key !== orderKey);
                orderData[indexTokenAddress] = newOrders;

                fs.writeFile(this.filePath, json.stringify(orderData, null, 2), "utf8", (err) => {
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
