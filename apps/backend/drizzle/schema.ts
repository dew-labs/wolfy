import { int8range } from "apps/backend/drizzle/types/int8Range";
import {
    pgTable,
    index,
    uuid,
    varchar,
    integer,
    boolean,
    numeric,
    jsonb,
    unique,
    bigint,
    serial,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const markets = pgTable(
    "markets",
    {
        uid: uuid().defaultRandom().primaryKey().notNull(),
        // TODO: failed to parse database type 'int8range'
        blockRange: int8range("block_range").notNull(),
        id: varchar({ length: 256 }).notNull(),
        creator: varchar({ length: 256 }).notNull(),
        marketToken: varchar("market_token", { length: 256 }).notNull(),
        indexToken: varchar("index_token", { length: 256 }).notNull(),
        longToken: varchar("long_token", { length: 256 }).notNull(),
        shortToken: varchar("short_token", { length: 256 }).notNull(),
        marketType: varchar("market_type", { length: 256 }).notNull(),
    },
    (table) => {
        return {
            creatorIdx: index().using("btree", table.creator.asc().nullsLast()),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            indexTokenIdx: index().using("btree", table.indexToken.asc().nullsLast()),
            longTokenIdx: index().using("btree", table.longToken.asc().nullsLast()),
            marketTokenIdx: index().using("btree", table.marketToken.asc().nullsLast()),
            marketTypeIdx: index().using("btree", table.marketType.asc().nullsLast()),
            shortTokenIdx: index().using("btree", table.shortToken.asc().nullsLast()),
        };
    }
);

export const orders = pgTable(
    "orders",
    {
        uid: uuid().defaultRandom().primaryKey().notNull(),
        // TODO: failed to parse database type 'int8range'
        blockRange: int8range("block_range").notNull(),
        id: varchar({ length: 256 }).notNull(),
        key: varchar({ length: 256 }).notNull(),
        account: varchar({ length: 256 }).notNull(),
        receiver: varchar({ length: 256 }).notNull(),
        market: varchar({ length: 256 }).notNull(),
        action: integer().notNull(),
        orderType: varchar("order_type", { length: 256 }).notNull(),
        isLong: boolean("is_long").notNull(),
        triggerPrice: numeric("trigger_price", { precision: 78, scale: 0 }).notNull(),
        acceptablePrice: numeric("acceptable_price", { precision: 78, scale: 0 }).notNull(),
        sizeDeltaUsd: numeric("size_delta_usd", { precision: 78, scale: 0 }).notNull(),
        initialCollateralToken: varchar("initial_collateral_token", { length: 256 }).notNull(),
        initialCollateralDeltaAmount: numeric("initial_collateral_delta_amount", {
            precision: 78,
            scale: 0,
        }).notNull(),
        isFrozen: boolean("is_frozen").notNull(),
        swapPath: jsonb("swap_path").notNull(),
        decreasePositionSwapType: varchar("decrease_position_swap_type", { length: 256 }).notNull(),
        executionFee: numeric("execution_fee", { precision: 78, scale: 0 }).notNull(),
        uiFeeReceiver: varchar("ui_fee_receiver", { length: 256 }).notNull(),
        callbackContract: varchar("callback_contract", { length: 256 }).notNull(),
        callbackGasLimit: numeric("callback_gas_limit", { precision: 78, scale: 0 }).notNull(),
        minOutputAmount: numeric("min_output_amount", { precision: 78, scale: 0 }).notNull(),
        cancelledReason: varchar("cancelled_reason", { length: 256 }),
        txHash: varchar("tx_hash", { length: 256 }).notNull(),
        createdAt: integer("created_at").notNull(),
        createdAtBlock: integer("created_at_block").notNull(),
    },
    (table) => {
        return {
            acceptablePriceIdx: index().using("btree", table.acceptablePrice.asc().nullsLast()),
            accountIdx: index().using("btree", table.account.asc().nullsLast()),
            actionIdx: index().using("btree", table.action.asc().nullsLast()),
            callbackContractIdx: index().using("btree", table.callbackContract.asc().nullsLast()),
            callbackGasLimitIdx: index().using("btree", table.callbackGasLimit.asc().nullsLast()),
            cancelledReasonIdx: index().using("btree", table.cancelledReason.asc().nullsLast()),
            createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
            createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
            decreasePositionSwapTypeIdx: index().using(
                "btree",
                table.decreasePositionSwapType.asc().nullsLast()
            ),
            executionFeeIdx: index().using("btree", table.executionFee.asc().nullsLast()),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            initialCollateralDeltaAmountIdx: index().using(
                "btree",
                table.initialCollateralDeltaAmount.asc().nullsLast()
            ),
            initialCollateralTokenIdx: index().using(
                "btree",
                table.initialCollateralToken.asc().nullsLast()
            ),
            isFrozenIdx: index().using("btree", table.isFrozen.asc().nullsLast()),
            isLongIdx: index().using("btree", table.isLong.asc().nullsLast()),
            keyIdx: index().using("btree", table.key.asc().nullsLast()),
            marketIdx: index().using("btree", table.market.asc().nullsLast()),
            minOutputAmountIdx: index().using("btree", table.minOutputAmount.asc().nullsLast()),
            orderTypeIdx: index().using("btree", table.orderType.asc().nullsLast()),
            receiverIdx: index().using("btree", table.receiver.asc().nullsLast()),
            sizeDeltaUsdIdx: index().using("btree", table.sizeDeltaUsd.asc().nullsLast()),
            swapPathIdx: index().using("btree", table.swapPath.asc().nullsLast()),
            triggerPriceIdx: index().using("btree", table.triggerPrice.asc().nullsLast()),
            txHashIdx: index().using("btree", table.txHash.asc().nullsLast()),
            uiFeeReceiverIdx: index().using("btree", table.uiFeeReceiver.asc().nullsLast()),
        };
    }
);

export const positions = pgTable(
    "positions",
    {
        uid: uuid().defaultRandom().primaryKey().notNull(),
        // TODO: failed to parse database type 'int8range'
        blockRange: int8range("block_range").notNull(),
        id: varchar({ length: 256 }).notNull(),
        key: varchar({ length: 256 }).notNull(),
        orderKey: varchar("order_key", { length: 256 }).notNull(),
        account: varchar({ length: 256 }).notNull(),
        market: varchar({ length: 256 }).notNull(),
        action: integer().notNull(),
        isLong: boolean("is_long").notNull(),
        executionPrice: numeric("execution_price", { precision: 78, scale: 0 }).notNull(),
        basePnlUsd: numeric("base_pnl_usd", { precision: 78, scale: 0 }),
        uncappedBasePnlUsd: numeric("uncapped_base_pnl_usd", { precision: 78, scale: 0 }),
        sizeInTokens: numeric("size_in_tokens", { precision: 78, scale: 0 }).notNull(),
        sizeInUsd: numeric("size_in_usd", { precision: 78, scale: 0 }).notNull(),
        sizeDeltaInTokens: numeric("size_delta_in_tokens", { precision: 78, scale: 0 }).notNull(),
        sizeDeltaUsd: numeric("size_delta_usd", { precision: 78, scale: 0 }).notNull(),
        indexTokenPriceMin: numeric("index_token_price_min", { precision: 78, scale: 0 }).notNull(),
        indexTokenPriceMax: numeric("index_token_price_max", { precision: 78, scale: 0 }).notNull(),
        collateralToken: varchar("collateral_token", { length: 256 }).notNull(),
        collateralTokenPriceMin: numeric("collateral_token_price_min", {
            precision: 78,
            scale: 0,
        }).notNull(),
        collateralTokenPriceMax: numeric("collateral_token_price_max", {
            precision: 78,
            scale: 0,
        }).notNull(),
        collateralAmount: numeric("collateral_amount", { precision: 78, scale: 0 }).notNull(),
        collateralDeltaAmount: numeric("collateral_delta_amount", {
            precision: 78,
            scale: 0,
        }).notNull(),
        priceImpactAmount: numeric("price_impact_amount", { precision: 78, scale: 0 }).notNull(),
        priceImpactUsd: numeric("price_impact_usd", { precision: 78, scale: 0 }).notNull(),
        priceImpactDiffUsd: numeric("price_impact_diff_usd", { precision: 78, scale: 0 }),
        borrowingFactor: numeric("borrowing_factor", { precision: 78, scale: 0 }).notNull(),
        fundingFeeAmountPerSize: numeric("funding_fee_amount_per_size", {
            precision: 78,
            scale: 0,
        }).notNull(),
        longTokenClaimableFundingAmountPerSize: numeric(
            "long_token_claimable_funding_amount_per_size",
            { precision: 78, scale: 0 }
        ).notNull(),
        shortTokenClaimableFundingAmountPerSize: numeric(
            "short_token_claimable_funding_amount_per_size",
            { precision: 78, scale: 0 }
        ).notNull(),
        txHash: varchar("tx_hash", { length: 256 }).notNull(),
        createdAt: integer("created_at").notNull(),
        createdAtBlock: integer("created_at_block").notNull(),
    },
    (table) => {
        return {
            accountIdx: index().using("btree", table.account.asc().nullsLast()),
            actionIdx: index().using("btree", table.action.asc().nullsLast()),
            basePnlUsdIdx: index().using("btree", table.basePnlUsd.asc().nullsLast()),
            borrowingFactorIdx: index().using("btree", table.borrowingFactor.asc().nullsLast()),
            collateralAmountIdx: index().using("btree", table.collateralAmount.asc().nullsLast()),
            collateralDeltaAmountIdx: index().using(
                "btree",
                table.collateralDeltaAmount.asc().nullsLast()
            ),
            collateralTokenIdx: index().using("btree", table.collateralToken.asc().nullsLast()),
            collateralTokenPriceMaxIdx: index().using(
                "btree",
                table.collateralTokenPriceMax.asc().nullsLast()
            ),
            collateralTokenPriceMinIdx: index().using(
                "btree",
                table.collateralTokenPriceMin.asc().nullsLast()
            ),
            createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
            createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
            executionPriceIdx: index().using("btree", table.executionPrice.asc().nullsLast()),
            fundingFeeAmountPerSizeIdx: index().using(
                "btree",
                table.fundingFeeAmountPerSize.asc().nullsLast()
            ),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            indexTokenPriceMaxIdx: index().using(
                "btree",
                table.indexTokenPriceMax.asc().nullsLast()
            ),
            indexTokenPriceMinIdx: index().using(
                "btree",
                table.indexTokenPriceMin.asc().nullsLast()
            ),
            isLongIdx: index().using("btree", table.isLong.asc().nullsLast()),
            keyIdx: index().using("btree", table.key.asc().nullsLast()),
            longTokenClaimableFundingAmountPerSizeIdx: index().using(
                "btree",
                table.longTokenClaimableFundingAmountPerSize.asc().nullsLast()
            ),
            marketIdx: index().using("btree", table.market.asc().nullsLast()),
            orderKeyIdx: index().using("btree", table.orderKey.asc().nullsLast()),
            priceImpactAmountIdx: index().using("btree", table.priceImpactAmount.asc().nullsLast()),
            priceImpactDiffUsdIdx: index().using(
                "btree",
                table.priceImpactDiffUsd.asc().nullsLast()
            ),
            priceImpactUsdIdx: index().using("btree", table.priceImpactUsd.asc().nullsLast()),
            shortTokenClaimableFundingAmountPerSizeIdx: index().using(
                "btree",
                table.shortTokenClaimableFundingAmountPerSize.asc().nullsLast()
            ),
            sizeDeltaInTokensIdx: index().using("btree", table.sizeDeltaInTokens.asc().nullsLast()),
            sizeDeltaUsdIdx: index().using("btree", table.sizeDeltaUsd.asc().nullsLast()),
            sizeInTokensIdx: index().using("btree", table.sizeInTokens.asc().nullsLast()),
            sizeInUsdIdx: index().using("btree", table.sizeInUsd.asc().nullsLast()),
            txHashIdx: index().using("btree", table.txHash.asc().nullsLast()),
            uncappedBasePnlUsdIdx: index().using(
                "btree",
                table.uncappedBasePnlUsd.asc().nullsLast()
            ),
        };
    }
);

export const deposits = pgTable(
    "deposits",
    {
        uid: uuid().defaultRandom().primaryKey().notNull(),
        // TODO: failed to parse database type 'int8range'
        blockRange: int8range("block_range").notNull(),
        id: varchar({ length: 256 }).notNull(),
        key: varchar({ length: 256 }).notNull(),
        account: varchar({ length: 256 }).notNull(),
        receiver: varchar({ length: 256 }).notNull(),
        market: varchar({ length: 256 }).notNull(),
        action: integer().notNull(),
        longToken: varchar("long_token", { length: 256 }).notNull(),
        shortToken: varchar("short_token", { length: 256 }).notNull(),
        longTokenAmount: numeric("long_token_amount", { precision: 78, scale: 0 }).notNull(),
        shortTokenAmount: numeric("short_token_amount", { precision: 78, scale: 0 }).notNull(),
        minMarketTokenAmount: numeric("min_market_token_amount", {
            precision: 78,
            scale: 0,
        }).notNull(),
        receivedMarketTokenAmount: numeric("received_market_token_amount", {
            precision: 78,
            scale: 0,
        }),
        executionFee: numeric("execution_fee", { precision: 78, scale: 0 }).notNull(),
        longTokenSwapPath: jsonb("long_token_swap_path").notNull(),
        shortTokenSwapPath: jsonb("short_token_swap_path").notNull(),
        callbackContract: varchar("callback_contract", { length: 256 }).notNull(),
        callbackGasLimit: numeric("callback_gas_limit", { precision: 78, scale: 0 }).notNull(),
        cancelledReason: varchar("cancelled_reason", { length: 256 }),
        cancelledReasonKey: varchar("cancelled_reason_key", { length: 256 }),
        txHash: varchar("tx_hash", { length: 256 }).notNull(),
        createdAt: integer("created_at").notNull(),
        createdAtBlock: integer("created_at_block").notNull(),
    },
    (table) => {
        return {
            accountIdx: index().using("btree", table.account.asc().nullsLast()),
            actionIdx: index().using("btree", table.action.asc().nullsLast()),
            callbackContractIdx: index().using("btree", table.callbackContract.asc().nullsLast()),
            callbackGasLimitIdx: index().using("btree", table.callbackGasLimit.asc().nullsLast()),
            cancelledReasonIdx: index().using("btree", table.cancelledReason.asc().nullsLast()),
            cancelledReasonKeyIdx: index().using(
                "btree",
                table.cancelledReasonKey.asc().nullsLast()
            ),
            createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
            createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
            executionFeeIdx: index().using("btree", table.executionFee.asc().nullsLast()),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            keyIdx: index().using("btree", table.key.asc().nullsLast()),
            longTokenAmountIdx: index().using("btree", table.longTokenAmount.asc().nullsLast()),
            longTokenIdx: index().using("btree", table.longToken.asc().nullsLast()),
            longTokenSwapPathIdx: index().using("btree", table.longTokenSwapPath.asc().nullsLast()),
            marketIdx: index().using("btree", table.market.asc().nullsLast()),
            minMarketTokenAmountIdx: index().using(
                "btree",
                table.minMarketTokenAmount.asc().nullsLast()
            ),
            receivedMarketTokenAmountIdx: index().using(
                "btree",
                table.receivedMarketTokenAmount.asc().nullsLast()
            ),
            receiverIdx: index().using("btree", table.receiver.asc().nullsLast()),
            shortTokenAmountIdx: index().using("btree", table.shortTokenAmount.asc().nullsLast()),
            shortTokenIdx: index().using("btree", table.shortToken.asc().nullsLast()),
            shortTokenSwapPathIdx: index().using(
                "btree",
                table.shortTokenSwapPath.asc().nullsLast()
            ),
            txHashIdx: index().using("btree", table.txHash.asc().nullsLast()),
        };
    }
);

export const withdrawals = pgTable(
    "withdrawals",
    {
        uid: uuid().defaultRandom().primaryKey().notNull(),
        // TODO: failed to parse database type 'int8range'
        blockRange: int8range("block_range").notNull(),
        id: varchar({ length: 256 }).notNull(),
        key: varchar({ length: 256 }).notNull(),
        account: varchar({ length: 256 }).notNull(),
        receiver: varchar({ length: 256 }).notNull(),
        market: varchar({ length: 256 }).notNull(),
        action: integer().notNull(),
        minLongTokenAmount: numeric("min_long_token_amount", { precision: 78, scale: 0 }).notNull(),
        minShortTokenAmount: numeric("min_short_token_amount", {
            precision: 78,
            scale: 0,
        }).notNull(),
        receivedLongTokenAmount: numeric("received_long_token_amount", { precision: 78, scale: 0 }),
        receivedShortTokenAmount: numeric("received_short_token_amount", {
            precision: 78,
            scale: 0,
        }),
        marketTokenAmount: numeric("market_token_amount", { precision: 78, scale: 0 }).notNull(),
        executionFee: numeric("execution_fee", { precision: 78, scale: 0 }).notNull(),
        longTokenSwapPath: jsonb("long_token_swap_path").notNull(),
        shortTokenSwapPath: jsonb("short_token_swap_path").notNull(),
        callbackContract: varchar("callback_contract", { length: 256 }).notNull(),
        callbackGasLimit: varchar("callback_gas_limit", { length: 256 }).notNull(),
        cancelledReason: varchar("cancelled_reason", { length: 256 }),
        cancelledReasonKey: varchar("cancelled_reason_key", { length: 256 }),
        txHash: varchar("tx_hash", { length: 256 }).notNull(),
        createdAt: integer("created_at").notNull(),
        createdAtBlock: integer("created_at_block").notNull(),
    },
    (table) => {
        return {
            accountIdx: index().using("btree", table.account.asc().nullsLast()),
            actionIdx: index().using("btree", table.action.asc().nullsLast()),
            callbackContractIdx: index().using("btree", table.callbackContract.asc().nullsLast()),
            callbackGasLimitIdx: index().using("btree", table.callbackGasLimit.asc().nullsLast()),
            cancelledReasonIdx: index().using("btree", table.cancelledReason.asc().nullsLast()),
            cancelledReasonKeyIdx: index().using(
                "btree",
                table.cancelledReasonKey.asc().nullsLast()
            ),
            createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
            createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
            executionFeeIdx: index().using("btree", table.executionFee.asc().nullsLast()),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            keyIdx: index().using("btree", table.key.asc().nullsLast()),
            longTokenSwapPathIdx: index().using("btree", table.longTokenSwapPath.asc().nullsLast()),
            marketIdx: index().using("btree", table.market.asc().nullsLast()),
            marketTokenAmountIdx: index().using("btree", table.marketTokenAmount.asc().nullsLast()),
            minLongTokenAmountIdx: index().using(
                "btree",
                table.minLongTokenAmount.asc().nullsLast()
            ),
            minShortTokenAmountIdx: index().using(
                "btree",
                table.minShortTokenAmount.asc().nullsLast()
            ),
            receivedLongTokenAmountIdx: index().using(
                "btree",
                table.receivedLongTokenAmount.asc().nullsLast()
            ),
            receivedShortTokenAmountIdx: index().using(
                "btree",
                table.receivedShortTokenAmount.asc().nullsLast()
            ),
            receiverIdx: index().using("btree", table.receiver.asc().nullsLast()),
            shortTokenSwapPathIdx: index().using(
                "btree",
                table.shortTokenSwapPath.asc().nullsLast()
            ),
            txHashIdx: index().using("btree", table.txHash.asc().nullsLast()),
        };
    }
);

export const blocks = pgTable(
    "_blocks",
    {
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        blockNumber: bigint("block_number", { mode: "number" }).primaryKey().notNull(),
        hash: varchar({ length: 255 }).notNull(),
    },
    (table) => {
        return {
            blocksHashUnique: unique("_blocks_hash_unique").on(table.hash),
        };
    }
);

export const checkpoints = pgTable(
    "_checkpoints",
    {
        id: varchar({ length: 10 }).primaryKey().notNull(),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        blockNumber: bigint("block_number", { mode: "number" }).notNull(),
        contractAddress: varchar("contract_address", { length: 66 }).notNull(),
    },
    (table) => {
        return {
            blockNumberIdx: index().using("btree", table.blockNumber.asc().nullsLast()),
            contractAddressIdx: index().using("btree", table.contractAddress.asc().nullsLast()),
        };
    }
);

export const metadatas = pgTable("_metadatas", {
    id: varchar({ length: 20 }).primaryKey().notNull(),
    value: varchar({ length: 128 }).notNull(),
});

export const templateSources = pgTable("_template_sources", {
    id: serial().primaryKey().notNull(),
    contractAddress: varchar("contract_address", { length: 66 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    startBlock: bigint("start_block", { mode: "number" }).notNull(),
    template: varchar({ length: 128 }).notNull(),
});
