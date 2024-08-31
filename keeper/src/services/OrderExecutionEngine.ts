import type { Account, TypedContractV2 } from "starknet";
import type { Order } from "../interfaces/Order";

import { logger } from "keeper/utils/logger";
import {
    createCall,
    createSatoruContract,
    executeAndWait,
    OrderHandlerABI,
    SatoruContract,
    toStarknetHexString,
    type SatoruContractAbi,
    type StarknetChainId,
} from "satoru-sdk";
import { getDataStoreContract } from "scripts/helpers";
import { getNetAndChainId } from "keeper/utils";

export class OrderExecutionEngine {
    async executeOrder(account: Account, order: Order, executionPrice: bigint): Promise<void> {
        const { chainId } = getNetAndChainId();
        const dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>> =
            getDataStoreContract(chainId, account);
        const market = await dataStoreContract.get_market(order.market);
        const indexTokenAddress: string = toStarknetHexString(market.index_token);
        const priceParams: Object = await this.setPriceParams(
            account,
            indexTokenAddress,
            executionPrice
        );
        await this.callToContract(account, chainId, order.key, priceParams);
    }

    private async setPriceParams(
        account: Account,
        indexTokenAddress: string,
        executionPrice: bigint
    ): Promise<any> {
        const currentBlockNum = await account.getBlockNumber();
        const currentBlock = await account.getBlock();
        const block0 = 0;
        const block1 = currentBlockNum;

        return {
            signer_info: 1,
            tokens: [indexTokenAddress],
            compacted_min_oracle_block_numbers: [block0, block0],
            compacted_max_oracle_block_numbers: [block1, block1],
            compacted_oracle_timestamps: [currentBlock.timestamp, currentBlock.timestamp], // not in use
            compacted_decimals: [0, 0], // decimals of the price, not in use
            compacted_min_prices_indexes: [0], // not in use
            compacted_max_prices_indexes: [0], // not in use
            compacted_min_prices: [2147483648010000], // doesn't matter
            compacted_max_prices: [executionPrice], // this is the price where order executed
            signatures: [
                ["signatures1", "signatures2"],
                ["signatures1", "signatures2"],
            ],
            price_feed_tokens: [],
        };
    }

    private async callToContract(
        account: Account,
        chainId: StarknetChainId,
        orderKey: string,
        params: any
    ): Promise<void> {
        const orderHandlerContract: TypedContractV2<
            SatoruContractAbi<SatoruContract.OrderHandler>
        > = createSatoruContract(chainId, SatoruContract.OrderHandler, OrderHandlerABI, account);

        logger.info("Executing Order ... 💨");

        const executeOrderReceipt = await executeAndWait(
            account,
            createCall(orderHandlerContract, "execute_order", [orderKey, params])
        );

        if (executeOrderReceipt.isSuccess()) {
            logger.success("Execute Successfully 🚀");
            logger.success(`== with Transaction Hash: ${executeOrderReceipt.transaction_hash}`);
        } else {
            // TODO: retry here
        }
    }
}
