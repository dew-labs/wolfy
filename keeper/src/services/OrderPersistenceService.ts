import { logger } from "@shared/utils/logger";
import { OrdersSchema, type Order } from "@shared/interfaces/Order";
import { Value } from "@sinclair/typebox/value";
import * as devalue from "devalue";
import * as path from "path";
import fs from "node:fs";

export class OrderPersistenceService {
    private readonly filePath: string;

    constructor() {
        this.filePath = path.resolve(__dirname, "../../data/orders.json");
    }

    loadOrders(): Record<string, Order[]> {
        try {
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, devalue.stringify({}));
                return {};
            }

            const data = fs.readFileSync(this.filePath, "utf8");
            const parsedData = devalue.parse(data);

            if (!Value.Check(OrdersSchema, parsedData)) {
                throw new Error("Invalid orders format");
            }

            return parsedData;
        } catch (err) {
            logger.error("[PersistOrder] Loading error");
            logger.error(err);
            return {};
        }
    }

    saveOrder(order: Order, indexTokenAddress: string): void {
        try {
            const limitOrders = this.loadOrders();

            if (!limitOrders[indexTokenAddress]) {
                limitOrders[indexTokenAddress] = [];
            }

            limitOrders[indexTokenAddress].push(order);

            fs.writeFileSync(this.filePath, devalue.stringify(limitOrders), "utf8");
        } catch (err) {
            logger.error("[PersistOrder] Saving error");
            logger.error(err);
        }
    }

    deleteOrder(orderKey: string, indexTokenAddress: string): void {
        try {
            const limitOrders = this.loadOrders();
            const orders = limitOrders[indexTokenAddress];

            if (!orders) {
                throw new Error(`No orders found for token address: ${indexTokenAddress}`);
            }

            const newOrders = orders.filter((order) => order.key !== orderKey);
            limitOrders[indexTokenAddress] = newOrders;

            fs.writeFileSync(this.filePath, devalue.stringify(limitOrders), "utf8");
        } catch (err) {
            logger.error("[PersistOrder] Removing error");
            logger.error(err);
        }
    }
}
