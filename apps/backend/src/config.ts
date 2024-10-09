import { z } from "zod";

const envSchema = z.object({
  NET: z.enum(["main", "sepolia"]),
  PORT: z.coerce.number().default(3002),
  DATABASE_URL: z.string(),
});

const envServer = envSchema.safeParse({
  NET: process.env.NET,
  PORT: process.env.BACKEND_PORT,
  DATABASE_URL: process.env.DATABASE_URL,
});

if (!envServer.success) {
  console.error(envServer.error.issues);
  throw new Error("There is an error with the server environment variables");
  process.exit(1);
}

export const config = envServer.data;
