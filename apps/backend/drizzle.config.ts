import { defineConfig } from "drizzle-kit";
import { config } from "./src/config";
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  dbCredentials: {
    url: config.DATABASE_URL,
  },
});
