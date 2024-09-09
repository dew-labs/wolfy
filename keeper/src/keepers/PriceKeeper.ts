import { OrderPersistenceService } from "../services/OrderPersistenceService";
import { PythPriceOracleService } from "../services/PythPriceOracleService";
import { type Emitter } from "nanoevents";
import type { Order } from "@/shared/interfaces/Order";

export class PriceKeeper {
    private readonly orderPersistenceService: OrderPersistenceService;

    constructor(private priceOracleService: PythPriceOracleService, private emitter: Emitter) {
        this.orderPersistenceService = new OrderPersistenceService();
        this.priceOracleService.on("oraclePricesUpdate", this.handlePriceUpdate);
    }

    private handlePriceUpdate = ({
        indexTokenAddress,
        oraclePrice,
    }: {
        indexTokenAddress: string;
        oraclePrice: bigint;
    }) => {
        // TODO: performance issue, should work on memory instead
        const limitOrders: Record<string, Order[]> = this.orderPersistenceService.loadOrders();
        if (!limitOrders[indexTokenAddress] || limitOrders[indexTokenAddress].length === 0) return;

        this.emitter.emit(
            "executeLimitOrders",
            limitOrders[indexTokenAddress],
            indexTokenAddress,
            oraclePrice
        );
    };
}
