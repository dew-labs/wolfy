import { expandDecimals } from "shared/utils/utils";
import { OrderExecutionEngine } from "./OrderExecutionEngine";
import { OrderPersistenceService } from "./OrderPersistenceService";
import { PythPriceOracleService } from "./PythPriceOracleService";
import { USD_DECIMALS } from "shared/utils/config";
import type { Account } from "starknet";
import type { LimitOrder, MarketOrder, OrdersMap } from "shared/interfaces/Order";

export class OrderService {
    constructor(
        private orderExecutionEngine: OrderExecutionEngine,
        private orderPersistenceService: OrderPersistenceService,
        private priceOracleService: PythPriceOracleService,
        private executingOrders = new Set(),
        private account: Account
    ) {
        this.priceOracleService.on("oraclePricesUpdate", this.handlePriceUpdate.bind(this));
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
        const limitOrders: OrdersMap = await this.orderPersistenceService.loadOrders();
        if (!limitOrders[indexTokenAddress]) return;

        Object.entries(limitOrders[indexTokenAddress]).forEach(async ([orderKey, order]) => {
            if (this.executingOrders.has(orderKey)) {
                return;
            }

            this.executingOrders.add(orderKey);

            const oraclePriceDecimal = Math.abs(exponent);

            const executionPrice: bigint =
                expandDecimals(oraclePrice, USD_DECIMALS - oraclePriceDecimal) /
                expandDecimals(1, oraclePriceDecimal);

            if (!this.canExecuteLimitOrder(order, executionPrice)) return;

            this.orderExecutionEngine.executeOrder(this.account, order, executionPrice);
            this.executingOrders.delete(orderKey);
        });
    }

    private canExecuteLimitOrder(order: LimitOrder, executionPrice: bigint): boolean {
        const acceptablePrice: bigint = order.acceptable_price;

        return true;
    }
}
