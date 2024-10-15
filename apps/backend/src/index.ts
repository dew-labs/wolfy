import { Elysia } from "elysia";
import { config } from "./config";
import { tradeRoute } from "./routes";

const app = new Elysia({ prefix: "/api/v1" })
    .onAfterHandle(
        ({ response }) =>
            new Response(
                JSON.stringify(response, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
                {}
            )
    )
    .use(tradeRoute)
    .listen(config.BACKEND_PORT);

console.log(`🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`);
