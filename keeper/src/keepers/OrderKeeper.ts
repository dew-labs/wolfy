import {
    cairoIntToBigInt,
    getProvider,
    OrderType,
    parseOrderType,
    ProviderType,
    SatoruContract,
    SatoruEvent,
    StarknetChainId,
    toStarknetHexString,
    type SatoruContractAbi,
    type SatoruEventHandler,
    type SatoruWebSocketProvider,
} from "satoru-sdk";

import { getDataStoreContract } from "../../../shared/utils/helpers";
import type { Account, TypedContractV2 } from "starknet";
import type { Order } from "../../../shared/interfaces/Order";
import type { PythPriceOracleService } from "../services/PythPriceOracleService";
import type { PythPriceFeed } from "../../../shared/interfaces/PythPriceFeed";
import { OrderPersistenceService } from "../services/OrderPersistenceService";
import { expandDecimals, executeOrder } from "../../../shared/utils/utils";
import { logger } from "../../../shared/utils/logger";
import { USD_DECIMALS } from "../../../shared/utils/config";

export class OrderKeeper {
    private readonly dataStoreContract: TypedContractV2<
        SatoruContractAbi<SatoruContract.DataStore>
    >;
    private readonly wssProvider: SatoruWebSocketProvider;
    private readonly orderPersistenceService: OrderPersistenceService;

    constructor(
        private priceOracleService: PythPriceOracleService,
        private account: Account,
        private chainId: StarknetChainId
    ) {
        this.dataStoreContract = getDataStoreContract(chainId, account);
        this.wssProvider = getProvider(ProviderType.WSS, chainId);
        this.orderPersistenceService = new OrderPersistenceService();
    }

    async subcribeOrderCreatedEvent() {
        const eventHandler: SatoruEventHandler<SatoruEvent.OrderCreated> = async (event) =>
            this.handleOrderCreated(event);

        await this.wssProvider.subscribeToEvent(SatoruEvent.OrderCreated, eventHandler);
    }

    async handleOrderCreated(event: any) {
        console.log("🚀 ~ OrderKeeper ~ handleOrderCreated ~ event:", event);
        const {
            key,
            order_type,
            market: marketKey,
            trigger_price,
            acceptable_price,
            is_long,
        } = event.order;

        // init data
        const orderKey: string = toStarknetHexString(key);
        const orderType: OrderType = parseOrderType(order_type);
        const triggerPrice: bigint = cairoIntToBigInt(trigger_price);
        const acceptablePrice: bigint = cairoIntToBigInt(acceptable_price);

        const market = await this.dataStoreContract.get_market(marketKey);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);

        const order: Order = {
            key: orderKey,
            market: marketKey,
            order_type: orderType,
            trigger_price: triggerPrice,
            acceptable_price: acceptablePrice,
            is_long,
        };
        if (
            [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(
                orderType
            )
        ) {
            // Market Order

            // Get oracle price
            const pythPriceFeed: PythPriceFeed = await this.priceOracleService.getPriceFromOracle(
                indexTokenAddress
            );

            const oraclePrice: string = pythPriceFeed.price.price;
            const exponent: number = pythPriceFeed.price.expo;
            const oraclePriceDecimal = Math.abs(exponent);

            const executionPrice: bigint =
                expandDecimals(oraclePrice, USD_DECIMALS - oraclePriceDecimal) /
                expandDecimals(1, oraclePriceDecimal);
            console.log("🚀 ~ OrderKeeper ~ handleOrderCreated ~ executionPrice:", executionPrice);

            // Execute Market Order
            await executeOrder(this.account, order, executionPrice);
            logger.success("New Market Order Created 📝");
            logger.success(`== with Order Key: ${orderKey}`);
        } else {
            // Limit Order

            // Store to json
            this.orderPersistenceService.saveOrder(order, orderKey);
            logger.success("New Limit Order Created 📝");
            logger.success(`== with Order Key: ${orderKey}`);
        }
    }
}
