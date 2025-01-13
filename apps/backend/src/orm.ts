import { drizzle } from "drizzle-orm/node-postgres";
import Elysia from "elysia";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";
import { config } from "./config";

const sslConfig = config.CA_CERT
    ? { ca: Buffer.from(config.CA_CERT, "base64").toString("utf-8"), rejectUnauthorized: true }
    : { rejectUnauthorized: false };
const pool = new Pool({
    host: config.DATABASE_HOST,
    port: parseInt(config.DATABASE_PORT),
    user: config.DATABASE_USER,
    password: config.DATABASE_PASS,
    database: config.DATABASE_NAME,
    ssl: sslConfig,
});

const orm = drizzle(pool, { schema, logger: true });

export type Orm = typeof orm;

export const ormPlugin = new Elysia({ name: "orm" }).decorate("orm", orm);
