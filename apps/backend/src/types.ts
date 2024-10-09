import type Elysia from "elysia";
import type { ORM } from "./orm";

export type App<BasePath extends string = ''> = Elysia<
  BasePath,
  false,
  {
    decorator: {
      orm: ORM;
    };
    store: {};
    derive: {};
    resolve: {};
  }
>;
