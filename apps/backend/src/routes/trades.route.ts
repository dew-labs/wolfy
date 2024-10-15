import { Elysia } from "elysia";
import { ormPlugin } from "../orm";

export const tradeRoute = new Elysia({ prefix: "/trades" })
    .use(ormPlugin)
    .get("/", ({ orm }) => orm.query.orders.findMany());
