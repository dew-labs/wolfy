import { defineConfig } from "drizzle-kit";
import { config } from "./src/config";

const sslConfig = config.CA_CERT ? "require" : false;

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/schema.ts",
    dbCredentials: {
        host: config.DATABASE_HOST,
        port: parseInt(config.DATABASE_PORT),
        user: config.DATABASE_USER,
        password: config.DATABASE_PASS,
        database: config.DATABASE_NAME,
        ssl: sslConfig,
    },
});
