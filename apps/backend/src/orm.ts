import { drizzle } from "drizzle-orm/node-postgres";
import Elysia from "elysia";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";
import { config } from "./config";

const sslConfig = config.CA_CERT
    ? { ca: Buffer.from(config.CA_CERT, "base64").toString("utf-8"), rejectUnauthorized: true }
    : { rejectUnauthorized: false };
const pool = new Pool({
    host: "wolfy-indexer-sepolia-wolfy-trade.l.aivencloud.com",
    port: 10635,
    user: "avnadmin",
    password: "AVNS_O-tcp_Le39gOIU35iwn",
    database: "sepolia_checkpoint",
    ssl: sslConfig,
});

const orm = drizzle(pool, { schema, logger: true });

export type Orm = typeof orm;

export const ormPlugin = new Elysia({ name: "orm" }).decorate("orm", orm);
