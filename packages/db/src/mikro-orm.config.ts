import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import { entities } from "./entities";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

// A factory, so env vars are read on first connection rather than on import:
// `next build` imports this module without database credentials.
export default function createConfig() {
  return defineConfig({
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    dbName: requireEnv("DB_NAME"),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
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
