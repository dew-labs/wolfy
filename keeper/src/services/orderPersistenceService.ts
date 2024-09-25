import { TypeCompiler } from "@sinclair/typebox/compiler";
import * as path from "path";

import { OrdersSchema, type Order } from "@wolfy/shared/interfaces";
import {
    createLogger,
    ensureFileExists,
    parseData,
    readFile,
    stringifyData,
    writeFile,
} from "@wolfy/shared/utils";

const logger = createLogger("OrderPersistenceService");

const filePath = path.resolve(__dirname, "../../data/orders.json");
const validator = TypeCompiler.Compile(OrdersSchema);

const validateOrders = (data: unknown): Record<string, Order[]> => {
    if (typeof data === "object" && data !== null && validator.Check(data)) {
        return data as Record<string, Order[]>;
    }
    throw new Error("Orders: Invalid format in JSON");
};

export const loadOrders = (): Record<string, Order[]> => {
    try {
        ensureFileExists(filePath, stringifyData({}));
        const data = readFile(filePath);
        const parsedData = parseData(data);
        return validateOrders(parsedData);
    } catch (error) {
        logger.error(error, "Orders: Failed to load from JSON");
        return {};
    }
};

export const saveOrder = (order: Order, indexTokenAddress: string): void => {
    try {
        const Orders = loadOrders();
        if (!Orders[indexTokenAddress]) {
            Orders[indexTokenAddress] = [];
        }
        Orders[indexTokenAddress].push(order);
        writeFile(filePath, stringifyData(Orders));
        logger.debug(`${order.orderType} Order ${order.key}: Saved to JSON`);
    } catch (error) {
        logger.error(error, `Order ${order.key}: Failed to save to JSON`);
    }
};

export const removeOrder = (orderKey: string, indexTokenAddress: string): void => {
    try {
        const orders = loadOrders();
        if (!orders[indexTokenAddress] || !orders[indexTokenAddress].length) {
            logger.warn(`Orders with token ${indexTokenAddress}: Not found in JSON`);
            return;
        }

        const initialOrderCount = orders[indexTokenAddress].length;
        orders[indexTokenAddress] = orders[indexTokenAddress].filter(
            (order) => order.key !== orderKey
        );

        if (orders[indexTokenAddress].length === initialOrderCount) {
            logger.warn(`Order ${orderKey}: Not found in JSON`);
            return;
        }

        writeFile(filePath, stringifyData(orders));
        logger.debug(`Order ${orderKey}: Removed from JSON`);
    } catch (error) {
        logger.error(error, `Order ${orderKey}: Failed to remove from JSON`);
    }
};
