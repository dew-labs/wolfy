import { SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export function lower(value: AnyPgColumn): SQL {
    return sql`lower(${value})`;
}
