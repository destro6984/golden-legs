import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDbEnv } from "./env";

const validEnv = {
  DB_HOST: "localhost",
  DB_PORT: "5433",
  DB_NAME: "golden_legs",
  DB_USER: "golden_legs",
  DB_PASSWORD: "s3cret",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseDbEnv", () => {
  it("returns typed values with the port as a number", () => {
    expect(parseDbEnv(validEnv)).toEqual({ ...validEnv, DB_PORT: 5433 });
  });

  it("reads process.env by default", () => {
    for (const [key, value] of Object.entries(validEnv)) {
      vi.stubEnv(key, value);
    }

    expect(parseDbEnv().DB_HOST).toBe("localhost");
  });

  it("lists every missing variable by name", () => {
    expect(() => parseDbEnv({})).toThrow(/DB_HOST[\s\S]*DB_PORT[\s\S]*DB_NAME[\s\S]*DB_USER[\s\S]*DB_PASSWORD/);
  });

  it.each([["not-a-port"], ["0"], ["70000"], ["54.3"]])("rejects DB_PORT=%s", (port) => {
    expect(() => parseDbEnv({ ...validEnv, DB_PORT: port })).toThrow(/DB_PORT/);
  });

  it("rejects an empty password", () => {
    expect(() => parseDbEnv({ ...validEnv, DB_PASSWORD: "" })).toThrow(/DB_PASSWORD/);
  });

  it("never includes the received values in the error", () => {
    const run = () => parseDbEnv({ ...validEnv, DB_PORT: "leaky-value", DB_PASSWORD: "" });

    expect(run).toThrow(/Invalid database environment variables/);
    expect(run).not.toThrow(/leaky-value/);
  });
});
