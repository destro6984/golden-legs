import type { EntityManager } from "@mikro-orm/postgresql";

export async function pingDatabase(em: EntityManager): Promise<void> {
  await em.getConnection().execute("select 1");
}
