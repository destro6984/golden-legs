import { MikroORM } from "@mikro-orm/postgresql";
import config from "./mikro-orm.config";

// Cached on globalThis so Next.js hot reload reuses one connection pool.
const globalForOrm = globalThis as unknown as { orm?: Promise<MikroORM> };

export function getOrm(): Promise<MikroORM> {
  globalForOrm.orm ??= MikroORM.init(config);
  return globalForOrm.orm;
}
