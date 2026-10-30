import { beforeEach, describe, expect, it, vi } from "vitest";
import { MikroORM } from "@mikro-orm/postgresql";
import createConfig from "./mikro-orm.config";
import { getOrm } from "./orm";

vi.mock("@mikro-orm/postgresql", () => ({ MikroORM: { init: vi.fn() } }));
vi.mock("./mikro-orm.config", () => ({ default: vi.fn(() => ({ dbName: "test" })) }));

const fakeOrm = {} as MikroORM;

beforeEach(() => {
  // The ORM is cached on globalThis; start every test from scratch.
  delete (globalThis as { orm?: unknown }).orm;
  vi.mocked(MikroORM.init).mockReset();
});

describe("getOrm", () => {
  it("initializes MikroORM with the config once and reuses it", async () => {
    vi.mocked(MikroORM.init).mockResolvedValue(fakeOrm);

    await expect(getOrm()).resolves.toBe(fakeOrm);
    await expect(getOrm()).resolves.toBe(fakeOrm);
    expect(MikroORM.init).toHaveBeenCalledTimes(1);
    expect(MikroORM.init).toHaveBeenCalledWith({ dbName: "test" });
    expect(createConfig).toHaveBeenCalled();
  });

  it("retries after a failed initialization", async () => {
    vi.mocked(MikroORM.init).mockRejectedValueOnce(new Error("bad env")).mockResolvedValueOnce(fakeOrm);

    await expect(getOrm()).rejects.toThrow("bad env");
    await expect(getOrm()).resolves.toBe(fakeOrm);
    expect(MikroORM.init).toHaveBeenCalledTimes(2);
  });
});
