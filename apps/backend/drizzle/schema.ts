import { pgTable, index, uuid, varchar, boolean, integer, bigint, serial } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"




export const orders = pgTable("orders", {
	uid: uuid().defaultRandom().primaryKey().notNull(),
	// TODO: failed to parse database type 'int8range'
	id: varchar({ length: 256 }).notNull(),
	author: varchar({ length: 256 }).notNull(),
	key: varchar({ length: 256 }).notNull(),
	market: varchar({ length: 256 }).notNull(),
	orderType: varchar("order_type", { length: 256 }).notNull(),
	isLong: boolean("is_long").notNull(),
	indexTokenAddress: varchar("index_token_address", { length: 256 }).notNull(),
	indexTokenDecimals: integer("index_token_decimals").notNull(),
	triggerPrice: varchar("trigger_price", { length: 256 }).notNull(),
	acceptablePrice: varchar("acceptable_price", { length: 256 }).notNull(),
	isExecuted: boolean("is_executed").notNull(),
	txHash: varchar("tx_hash", { length: 256 }).notNull(),
	createdAt: integer("created_at").notNull(),
	createdAtBlock: integer("created_at_block").notNull(),
},
(table) => {
	return {
		acceptablePriceIdx: index().using("btree", table.acceptablePrice.asc().nullsLast()),
		authorIdx: index().using("btree", table.author.asc().nullsLast()),
		createdAtBlockIdx: index().using("btree", table.createdAtBlock.asc().nullsLast()),
		createdAtIdx: index().using("btree", table.createdAt.asc().nullsLast()),
		idIdx: index().using("btree", table.id.asc().nullsLast()),
		indexTokenAddressIdx: index().using("btree", table.indexTokenAddress.asc().nullsLast()),
		indexTokenDecimalsIdx: index().using("btree", table.indexTokenDecimals.asc().nullsLast()),
		isExecutedIdx: index().using("btree", table.isExecuted.asc().nullsLast()),
		isLongIdx: index().using("btree", table.isLong.asc().nullsLast()),
		keyIdx: index().using("btree", table.key.asc().nullsLast()),
		marketIdx: index().using("btree", table.market.asc().nullsLast()),
		orderTypeIdx: index().using("btree", table.orderType.asc().nullsLast()),
		triggerPriceIdx: index().using("btree", table.triggerPrice.asc().nullsLast()),
		txHashIdx: index().using("btree", table.txHash.asc().nullsLast()),
	}
});

export const checkpoints = pgTable("_checkpoints", {
	id: varchar({ length: 10 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	blockNumber: bigint("block_number", { mode: "number" }).notNull(),
	contractAddress: varchar("contract_address", { length: 66 }).notNull(),
},
(table) => {
	return {
		blockNumberIdx: index().using("btree", table.blockNumber.asc().nullsLast()),
		contractAddressIdx: index().using("btree", table.contractAddress.asc().nullsLast()),
	}
});

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
