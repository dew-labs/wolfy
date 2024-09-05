import { executeOrder } from "../../../shared/utils/utils";
import { OrderPersistenceService } from "../services/OrderPersistenceService";
import { PythPriceOracleService } from "../services/PythPriceOracleService";
import type { Account } from "starknet";
import type { Order } from "../../../shared/interfaces/Order";

export class PriceKeeper {
    private readonly executingOrders: Set<string>;
    private readonly orderPersistenceService: OrderPersistenceService;

    constructor(private priceOracleService: PythPriceOracleService, private account: Account) {
        this.priceOracleService.on("oraclePricesUpdate", this.handlePriceUpdate);
        this.orderPersistenceService = new OrderPersistenceService();
        this.executingOrders = new Set();
    }

    private handlePriceUpdate = async ({
        indexTokenAddress,
        oraclePrice,
    }: {
        indexTokenAddress: string;
        oraclePrice: bigint;
    }) => {
        // TODO: performance issue, should work on memory instead
        const limitOrders: Record<string, Order[]> =
            await this.orderPersistenceService.loadOrders();
        if (!limitOrders[indexTokenAddress]) return;

        limitOrders[indexTokenAddress].forEach(async (order) => {
            if (this.executingOrders.has(order.key)) {
                return;
            } else {
                this.executingOrders.add(order.key);
            }

            // Execute Limit Order
            if (this.canExecuteLimitOrder(order, oraclePrice)) {
                console.log(
                    "🚀 ~ PriceKeeper ~ limitOrders[indexTokenAddress].forEach ~ oraclePrice:",
                    oraclePrice
                );
                await executeOrder(this.account, order, oraclePrice);
                this.executingOrders.delete(order.key);
            }
        });
    };

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
