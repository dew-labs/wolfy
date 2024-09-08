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
import { OrderPersistenceService } from "../services/OrderPersistenceService";
import { executeOrder } from "../../../shared/utils/utils";
import { logger } from "../../../shared/utils/logger";

export class OrderKeeper {
    private readonly dataStoreContract: TypedContractV2<
        SatoruContractAbi<SatoruContract.DataStore>
    >;
    private wssProvider?: SatoruWebSocketProvider;
    private readonly orderPersistenceService: OrderPersistenceService;

    constructor(
        private priceOracleService: PythPriceOracleService,
        private account: Account,
        private chainId: StarknetChainId
    ) {
        this.dataStoreContract = getDataStoreContract(chainId, account);
        this.orderPersistenceService = new OrderPersistenceService();
        this.start();
    }

    async start() {
        this.wssProvider = getProvider(ProviderType.WSS, this.chainId);
        await this.wssProvider.subscribeToEvent(SatoruEvent.OrderCreated, this.handleOrderCreated);
        this.wssProvider.onClose(this.onCloseHandler);
    }

    onCloseHandler() {
        console.log("restart");
        this.start();
    }

    // TODO: handler for subcribe error

    handleOrderCreated: SatoruEventHandler<SatoruEvent.OrderCreated> = async (event) => {
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

            const longTokenAddress: string = toStarknetHexString(market.long_token);
            const shortTokenAddress: string = toStarknetHexString(market.short_token);

            // Get oracle price
            try {
                const executionIndexPrice: bigint =
                    this.priceOracleService.getOraclePrice(indexTokenAddress);
                const executionLongPrice: bigint =
                    this.priceOracleService.getOraclePrice(longTokenAddress);
                const executionShortPrice: bigint =
                    this.priceOracleService.getOraclePrice(shortTokenAddress);

                // TODO: execute in child process
                await executeOrder(
                    this.account,
                    order,
                    indexTokenAddress,
                    longTokenAddress,
                    shortTokenAddress,
                    executionIndexPrice,
                    executionLongPrice,
                    executionShortPrice
                );
                logger.success("New Market Order Executed 📝");
                logger.success(`== with Order Key: ${orderKey}`);
            } catch {
                // TODO: call cancel order
            }

            // Execute Market Order
        } else {
            // Limit Order

            // Store to json
            // TODO: execute right away if oracle price match
            this.orderPersistenceService.saveOrder(order, indexTokenAddress);
            logger.success("New Limit Order Created 📝");
            logger.success(`== with Order Key: ${orderKey}`);
        }
    };
}
