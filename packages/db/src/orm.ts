import { MikroORM } from "@mikro-orm/postgresql";
import createConfig from "./mikro-orm.config";

// Cached on globalThis so Next.js hot reload reuses one connection pool.
const globalForOrm = globalThis as unknown as { orm?: Promise<MikroORM> };

async function initOrm(): Promise<MikroORM> {
  return MikroORM.init(createConfig());
}

export function getOrm(): Promise<MikroORM> {
  globalForOrm.orm ??= initOrm().catch((error: unknown) => {
    // Forget the failed attempt so the next call can retry.
    globalForOrm.orm = undefined;
    throw error;
  });
  return globalForOrm.orm;
}
