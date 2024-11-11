import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { config } from "./config";
import { cors } from "@elysiajs/cors";
import { accountRoute } from "./routes";

const app = new Elysia()
    .use(
        swagger({
            documentation: {
                info: {
                    title: "Wolfy Backend",
                    version: "1.0.0",
                },
                tags: [{ name: "Account", description: "Account endpoints" }],
            },
            scalarConfig: {
                proxy: "",
                servers: [
                    { url: `http://localhost:${config.BACKEND_PORT || 3002}`, description: "Development server" },
                    { url: "https://backend-sepolia.wolfy.trade", description: "Sepolia prod server" },
                ],
            },
        })
    )
    .use(cors())
    .group("/api/v1", (app) => app.use(accountRoute))
    .listen(config.BACKEND_PORT || 3002);

console.log(`🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`);
