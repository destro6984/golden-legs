import { asFunction, type AwilixContainer } from "awilix";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrm, type MikroORM } from "@golden-legs/db";
import { HealthService } from "../services/health/health.service";
import { getContainer, withScope } from "./container";
import type { Cradle } from "./cradle";

vi.mock("@golden-legs/db", () => ({ getOrm: vi.fn(), pingDatabase: vi.fn() }));

function fakeOrm() {
  let forks = 0;
  return { em: { fork: vi.fn(() => ({ fork: ++forks })) } } as unknown as MikroORM;
}

beforeEach(() => {
  // The container is cached on globalThis; start every test from scratch.
  delete (globalThis as { container?: unknown }).container;
  vi.mocked(getOrm).mockReset();
});

describe("getContainer", () => {
  it("builds the container once and reuses it", async () => {
    const orm = fakeOrm();
    vi.mocked(getOrm).mockResolvedValue(orm);

    const first = await getContainer();
    const second = await getContainer();

    expect(second).toBe(first);
    expect(getOrm).toHaveBeenCalledTimes(1);
    expect(first.resolve("orm")).toBe(orm);
  });

  it("retries after a failed build instead of caching the failure", async () => {
    vi.mocked(getOrm).mockRejectedValueOnce(new Error("bad config")).mockResolvedValueOnce(fakeOrm());

    await expect(getContainer()).rejects.toThrow("bad config");
    await expect(getContainer()).resolves.toBeDefined();
    expect(getOrm).toHaveBeenCalledTimes(2);
  });

  it("runs in strict mode: a singleton may not depend on the scoped EntityManager", async () => {
    vi.mocked(getOrm).mockResolvedValue(fakeOrm());
    const container = (await getContainer()) as unknown as AwilixContainer;

    container.register({ leaky: asFunction(({ em }: Cradle) => em).singleton() });

    expect(() => container.resolve("leaky")).toThrow(/em/);
  });
});

describe("withScope", () => {
  it("gives each scope its own EntityManager fork and services", async () => {
    vi.mocked(getOrm).mockResolvedValue(fakeOrm());

    const first = await withScope(async ({ em, healthService }) => ({ em, healthService }));
    const second = await withScope(async ({ em }) => em);

    expect(first.em).toEqual({ fork: 1 });
    expect(second).toEqual({ fork: 2 });
    expect(first.healthService).toBeInstanceOf(HealthService);
  });

  it("returns the work result and propagates its errors", async () => {
    vi.mocked(getOrm).mockResolvedValue(fakeOrm());

    await expect(withScope(async () => 42)).resolves.toBe(42);
    await expect(
      withScope(async () => {
        throw new Error("work failed");
      }),
    ).rejects.toThrow("work failed");
  });
});
