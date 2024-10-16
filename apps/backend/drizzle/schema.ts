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
        key: varchar({ length: 256 }).notNull(),
        market: varchar({ length: 256 }).notNull(),
        orderType: varchar("order_type", { length: 256 }).notNull(),
        isLong: boolean("is_long").notNull(),
        indexTokenAddress: varchar("index_token_address", { length: 256 }).notNull(),
        sizeDeltaUsd: numeric("size_delta_usd", { precision: 78, scale: 0 }).notNull(),
        triggerPrice: numeric("trigger_price", { precision: 78, scale: 0 }).notNull(),
        acceptablePrice: numeric("acceptable_price", { precision: 78, scale: 0 }).notNull(),
        isExecuted: boolean("is_executed").notNull(),
        txHash: varchar("tx_hash", { length: 256 }).notNull(),
        createdAt: integer("created_at").notNull(),
        createdAtBlock: integer("created_at_block").notNull(),
    },
    (table) => {
        return {
            acceptablePriceIdx: index().using("btree", table.acceptablePrice.asc().nullsLast()),
            accountIdx: index().using("btree", table.account.asc().nullsLast()),
            createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
            createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
            idIdx: index().using("btree", table.id.asc().nullsLast()),
            indexTokenAddressIdx: index().using("btree", table.indexTokenAddress.asc().nullsLast()),
            isExecutedIdx: index().using("btree", table.isExecuted.asc().nullsLast()),
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
        isClosed: boolean("is_closed").notNull(),
        isLiquidated: boolean("is_liquidated").notNull(),
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
            isClosedIdx: index().using("btree", table.isClosed.asc().nullsLast()),
            isLiquidatedIdx: index().using("btree", table.isLiquidated.asc().nullsLast()),
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
