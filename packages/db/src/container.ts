import { asFunction, asValue } from "awilix";
import type { EntityManager, MikroORM } from "@mikro-orm/postgresql";
import type { AppContainer, Cradle } from "@golden-legs/core";
import { getOrm } from "./orm";

declare module "@golden-legs/core" {
  interface Cradle {
    orm: MikroORM;
    /** A fresh EntityManager fork for each request scope. */
    em: EntityManager;
  }
}

export async function registerDb(container: AppContainer): Promise<void> {
  const orm = await getOrm();
  container.register({
    orm: asValue(orm),
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
  });
}
