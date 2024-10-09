import { orders } from "../../drizzle/schema";
import type { App } from "../types";

export const tradesGroup = (app: App<"apitrades">) =>
  app.get("", ({ orm }) => orm.select().from(orders));
