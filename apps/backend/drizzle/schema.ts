import {
    bigint,
    boolean,
    index,
    integer,
    numeric,
    pgTable,
    serial,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { int8range } from "./types/int8Range";

export const orders = pgTable(
    "orders",
    {
        uid: uuid().defaultRandom().primaryKey().notNull(),
        // TODO: failed to parse database type 'int8range'
        blockRange: int8range("block_range").notNull(),
        id: varchar({ length: 256 }).notNull(),
        account: varchar({ length: 256 }).notNull(),
        action: integer(),
        key: varchar({ length: 256 }).notNull(),
        market: varchar({ length: 256 }).notNull(),
        orderType: varchar("order_type", { length: 256 }).notNull(),
        isLong: boolean("is_long").notNull(),
        initialCollateralToken: varchar("initial_collateral_token", { length: 256 }).notNull(),
        indexTokenAddress: varchar("index_token_address", { length: 256 }).notNull(),
        sizeDeltaUsd: numeric("size_delta_usd", { precision: 78, scale: 0 }).notNull(),
        triggerPrice: numeric("trigger_price", { precision: 78, scale: 0 }).notNull(),
        acceptablePrice: numeric("acceptable_price", { precision: 78, scale: 0 }).notNull(),
        txHash: varchar("tx_hash", { length: 256 }).notNull(),
        createdAt: integer("created_at").notNull(),
        createdAtBlock: integer("created_at_block").notNull(),
    },
    (table) => {
        return {
            acceptablePriceIdx: index().using("btree", table.acceptablePrice.asc().nullsLast()),
            accountIdx: index().using("btree", table.account.asc().nullsLast()),
            actionIdx: index().using("btree", table.action.asc().nullsLast()),
            createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
            createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            indexTokenAddressIdx: index().using("btree", table.indexTokenAddress.asc().nullsLast()),
            initialCollateralTokenIdx: index().using(
                "btree",
                table.initialCollateralToken.asc().nullsLast()
            ),
            isLongIdx: index().using("btree", table.isLong.asc().nullsLast()),
            keyIdx: index().using("btree", table.key.asc().nullsLast()),
            marketIdx: index().using("btree", table.market.asc().nullsLast()),
            orderTypeIdx: index().using("btree", table.orderType.asc().nullsLast()),
            sizeDeltaUsdIdx: index().using("btree", table.sizeDeltaUsd.asc().nullsLast()),
            triggerPriceIdx: index().using("btree", table.triggerPrice.asc().nullsLast()),
            txHashIdx: index().using("btree", table.txHash.asc().nullsLast()),
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
        account: varchar({ length: 256 }).notNull(),
        key: varchar({ length: 256 }).notNull(),
        market: varchar({ length: 256 }).notNull(),
        isLong: boolean("is_long").notNull(),
        collateralAmount: varchar("collateral_amount", { length: 256 }).notNull(),
        collateralToken: varchar("collateral_token", { length: 256 }).notNull(),
        sizeInUsd: numeric("size_in_usd", { precision: 78, scale: 0 }).notNull(),
        sizeDeltaUsd: numeric("size_delta_usd", { precision: 78, scale: 0 }).notNull(),
        sizeInTokens: numeric("size_in_tokens", { precision: 78, scale: 0 }).notNull(),
        txHash: varchar("tx_hash", { length: 256 }).notNull(),
        createdAt: integer("created_at").notNull(),
        createdAtBlock: integer("created_at_block").notNull(),
    },
    (table) => {
        return {
            accountIdx: index().using("btree", table.account.asc().nullsLast()),
            collateralAmountIdx: index().using("btree", table.collateralAmount.asc().nullsLast()),
            collateralTokenIdx: index().using("btree", table.collateralToken.asc().nullsLast()),
            createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
            createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            isLongIdx: index().using("btree", table.isLong.asc().nullsLast()),
            keyIdx: index().using("btree", table.key.asc().nullsLast()),
            marketIdx: index().using("btree", table.market.asc().nullsLast()),
            sizeDeltaUsdIdx: index().using("btree", table.sizeDeltaUsd.asc().nullsLast()),
            sizeInTokensIdx: index().using("btree", table.sizeInTokens.asc().nullsLast()),
            sizeInUsdIdx: index().using("btree", table.sizeInUsd.asc().nullsLast()),
            txHashIdx: index().using("btree", table.txHash.asc().nullsLast()),
        };
    }
);

export const tradehistories = pgTable(
    "tradehistories",
    {
        uid: uuid().defaultRandom().primaryKey().notNull(),
        // TODO: failed to parse database type 'int8range'
        blockRange: int8range("block_range").notNull(),
        id: varchar({ length: 256 }).notNull(),
        account: varchar({ length: 256 }).notNull(),
        key: varchar({ length: 256 }).notNull(),
        action: integer().notNull(),
        market: varchar({ length: 256 }).notNull(),
        isLong: boolean("is_long").notNull(),
        orderSizeUsd: numeric("order_size_usd", { precision: 78, scale: 0 }),
        orderPrice: numeric("order_price", { precision: 78, scale: 0 }),
        depositLongTokenAmount: numeric("deposit_long_token_amount", { precision: 78, scale: 0 }),
        depositShortTokenAmount: numeric("deposit_short_token_amount", { precision: 78, scale: 0 }),
        poolMarketTokenAmount: numeric("pool_market_token_amount", { precision: 78, scale: 0 }),
        txHash: varchar("tx_hash", { length: 256 }).notNull(),
        createdAt: integer("created_at").notNull(),
        createdAtBlock: integer("created_at_block").notNull(),
    },
    (table) => {
        return {
            accountIdx: index().using("btree", table.account.asc().nullsLast()),
            actionIdx: index().using("btree", table.action.asc().nullsLast()),
            createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
            createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
            depositLongTokenAmountIdx: index().using(
                "btree",
                table.depositLongTokenAmount.asc().nullsLast()
            ),
            depositShortTokenAmountIdx: index().using(
                "btree",
                table.depositShortTokenAmount.asc().nullsLast()
            ),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            isLongIdx: index().using("btree", table.isLong.asc().nullsLast()),
            keyIdx: index().using("btree", table.key.asc().nullsLast()),
            marketIdx: index().using("btree", table.market.asc().nullsLast()),
            orderPriceIdx: index().using("btree", table.orderPrice.asc().nullsLast()),
            orderSizeUsdIdx: index().using("btree", table.orderSizeUsd.asc().nullsLast()),
            poolMarketTokenAmountIdx: index().using(
                "btree",
                table.poolMarketTokenAmount.asc().nullsLast()
            ),
            txHashIdx: index().using("btree", table.txHash.asc().nullsLast()),
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
