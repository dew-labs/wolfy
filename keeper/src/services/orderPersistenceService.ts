import * as path from "path";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { logger } from "@/shared/utils/logger";
import { OrdersSchema, type Order } from "@/shared/interfaces/Order";
import {
    readFile,
    writeFile,
    parseData,
    stringifyData,
    ensureFileExists,
} from "@/shared/utils/file";

const filePath = path.resolve(__dirname, "../../data/orders.json");
const validator = TypeCompiler.Compile(OrdersSchema);

const validateOrders = (data: unknown): Record<string, Order[]> => {
    if (typeof data === "object" && data !== null && validator.Check(data)) {
        return data as Record<string, Order[]>;
    }
    throw new Error("Invalid orders format");
};

export const loadOrders = (): Record<string, Order[]> => {
    try {
        ensureFileExists(filePath, stringifyData({}));
        const data = readFile(filePath);
        const parsedData = parseData(data);
        return validateOrders(parsedData);
    } catch (error) {
        logger.error(error, "Error loading orders");
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
        logger.debug(`Limit Order saved : ${order.key}`);
    } catch (error) {
        logger.error(error, `Error saving order: ${order.key}`);
    }
};

export const removeOrder = (orderKey: string, indexTokenAddress: string): void => {
    try {
        const orders = loadOrders();
        if (!orders[indexTokenAddress] || !orders[indexTokenAddress].length) {
            logger.warn(`No orders found for token address: ${indexTokenAddress}`);
            return;
        }

        const initialOrderCount = orders[indexTokenAddress].length;
        orders[indexTokenAddress] = orders[indexTokenAddress].filter(
            (order) => order.key !== orderKey
        );

        if (orders[indexTokenAddress].length === initialOrderCount) {
            logger.warn(
                `Order with key ${orderKey} not found for token address: ${indexTokenAddress}`
            );
            return;
        }

        writeFile(filePath, stringifyData(orders));
        logger.debug(`Order removed: ${orderKey} for token address: ${indexTokenAddress}`);
    } catch (error) {
        logger.error(
            error,
            `Error removing order: ${orderKey} for token address: ${indexTokenAddress}`
        );
    }
};
