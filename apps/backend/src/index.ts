import { Elysia } from "elysia";
import { config } from "./config";
import { tradesGroup } from "./groups/trades";
import { orm } from "./orm";

const app = new Elysia().decorate("orm", orm);

app.group("api", (api) => api.group("trades", tradesGroup));

app.listen(config.PORT);

console.log(
  `🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`
);
