import { executeOrder, expandDecimals } from "../../../shared/utils/utils";
import { OrderPersistenceService } from "../services/OrderPersistenceService";
import { PythPriceOracleService } from "../services/PythPriceOracleService";
import { USD_DECIMALS } from "../../../shared/utils/config";
import type { Account } from "starknet";
import type { Order, OrdersMap } from "../../../shared/interfaces/Order";

export class PriceKeeper {
    private readonly executingOrders: Set<string>;
    private readonly orderPersistenceService: OrderPersistenceService;

    constructor(private priceOracleService: PythPriceOracleService, private account: Account) {
        this.priceOracleService.on("oraclePricesUpdate", this.handlePriceUpdate.bind(this));
        this.orderPersistenceService = new OrderPersistenceService();
        this.executingOrders = new Set();
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
            } else {
                this.executingOrders.add(orderKey);
            }

            const oraclePriceDecimal = Math.abs(exponent);

            const executionPrice: bigint =
                expandDecimals(oraclePrice, USD_DECIMALS - oraclePriceDecimal) /
                expandDecimals(1, oraclePriceDecimal);

            // Execute Limit Order
            if (this.canExecuteLimitOrder(order, executionPrice)) {
                await executeOrder(this.account, order, executionPrice);
                this.executingOrders.delete(orderKey);
            }
        });
    }

    private canExecuteLimitOrder(order: Order, executionPrice: bigint): boolean {
        const acceptablePrice: bigint = order.acceptable_price;

        if (order.is_long) {
            return executionPrice <= acceptablePrice;
        } else {
            return executionPrice >= acceptablePrice;
        }

        return true;
    }
}
