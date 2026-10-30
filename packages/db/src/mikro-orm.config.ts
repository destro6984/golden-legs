import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import { entities } from "./entities";
import { parseDbEnv } from "./env";

// A factory, so env vars are read on first connection rather than on import:
// `next build` imports this module without database credentials.
export default function createConfig() {
  const env = parseDbEnv();
  return defineConfig({
    host: env.DB_HOST,
    port: env.DB_PORT,
    dbName: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    entities,
    // The schema starts empty; entities arrive with the first feature.
    discovery: { warnWhenNoEntities: false },
    extensions: [Migrator],
    // Relative to the working directory, so the CLI runs from packages/db.
    migrations: {
      path: "src/migrations",
      pathTs: "src/migrations",
    },
    pool: { min: 0, max: 10 },
  });
}
