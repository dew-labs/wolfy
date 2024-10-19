import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { config } from "./config";
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
            },
        })
    )
    .group("/api/v1", (app) => app.use(accountRoute))
    .listen(config.BACKEND_PORT || 3002);

console.log(`🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`);
