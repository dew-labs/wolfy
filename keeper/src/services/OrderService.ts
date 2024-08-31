import { expandDecimals } from "keeper/utils/decimal";
import type { LimitOrder, MarketOrder, OrdersMap } from "../interfaces/Order";
import { OrderExecutionEngine } from "./OrderExecutionEngine";
import { OrderPersistenceService } from "./OrderPersistenceService";
import { PythPriceOracleService } from "./PythPriceOracleService";
import { USD_DECIMALS } from "keeper/config";
import type { Account } from "starknet";

export class OrderService {
    constructor(
        private orderExecutionEngine: OrderExecutionEngine,
        private orderPersistenceService: OrderPersistenceService,
        private priceOracleService: PythPriceOracleService,
        private executingOrders = new Set(),
        private account: Account
    ) {
        this.priceOracleService.on("oraclePricesUpdate", this.handlePriceUpdate.bind(this));
        this.account = account;
    }

    private async handlePriceUpdate({
        indexTokenAddress,
        oraclePrice,
        exponent,
    }: {
        indexTokenAddress: string;
        oraclePrice: string;
        exponent: number;
    }) {
        // Check all limit orders for the symbol and execute if conditions are met
        const limitOrders: OrdersMap = await this.orderPersistenceService.loadOrders();
        if (!limitOrders[indexTokenAddress]) return;

        Object.entries(limitOrders[indexTokenAddress]).forEach(async ([orderKey, orderData]) => {
            if (this.executingOrders.has(orderKey)) {
                return;
            }

            this.executingOrders.add(orderKey);

            const oraclePriceDecimal = Math.abs(exponent);

            const executionPrice: bigint =
                expandDecimals(oraclePrice, USD_DECIMALS - oraclePriceDecimal) /
                expandDecimals(1, oraclePriceDecimal);

            const acceptablePrice: bigint = orderData.acceptable_price;

            // if (!isPriceValidToExecute(isLong, currentPrice, acceptablePrice)) return;

            this.orderExecutionEngine.executeOrder(this.account, orderData, executionPrice);
            this.executingOrders.delete(orderKey);
        });
    }

    private canExecuteLimitOrder(order: LimitOrder, executionPrice: bigint): boolean {
        // return order.triggerPrice <= currentPrice;
        return true;
    }
}
