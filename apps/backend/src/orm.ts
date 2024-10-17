import { drizzle } from "drizzle-orm/node-postgres";
import Elysia from "elysia";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";
import { config } from "./config";

const pool = new Pool({
    connectionString: config.DATABASE_URL,
});

const orm = drizzle(pool, { schema, logger: true });

export type Orm = typeof orm;

export const ormPlugin = new Elysia({ name: "orm" }).decorate("orm", orm);
