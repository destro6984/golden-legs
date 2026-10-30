import { afterEach, describe, expect, it, vi } from "vitest";
import { Migrator } from "@mikro-orm/migrations";
import createConfig from "./mikro-orm.config";
import { entities } from "./entities";

afterEach(() => {
  vi.unstubAllEnvs();
});

function stubValidEnv() {
  vi.stubEnv("DB_HOST", "db.internal");
  vi.stubEnv("DB_PORT", "6543");
  vi.stubEnv("DB_NAME", "golden_legs");
  vi.stubEnv("DB_USER", "app");
  vi.stubEnv("DB_PASSWORD", "s3cret");
}

describe("createConfig", () => {
  it("builds the connection from the DB_* variables", () => {
    stubValidEnv();

    expect(createConfig()).toMatchObject({
      host: "db.internal",
      port: 6543,
      dbName: "golden_legs",
      user: "app",
      password: "s3cret",
      entities,
    });
  });

  it("registers migrations in src/migrations and bounds the pool", () => {
    stubValidEnv();

    const config = createConfig();

    expect(config.extensions).toEqual([Migrator]);
    expect(config.migrations).toMatchObject({ path: "src/migrations", pathTs: "src/migrations" });
    expect(config.pool).toEqual({ min: 0, max: 10 });
  });

  it("fails before connecting when the variables are invalid", () => {
    stubValidEnv();
    vi.stubEnv("DB_PORT", "nope");

    expect(() => createConfig()).toThrow(/DB_PORT/);
  });
});
