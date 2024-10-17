import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { config } from "./config";
import { tradeRoute } from "./routes";

const app = new Elysia()
    .use(swagger({
        documentation: {
            info: {
                title: "Wolfy Backend",
                version: "1.0.0",
            },
            tags: [
                { name: "Trade History", description: "Trade history endpoints" },
            ]
        }
    }))
    .use(tradeRoute)
    .listen(config.BACKEND_PORT);

console.log(`🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`);
