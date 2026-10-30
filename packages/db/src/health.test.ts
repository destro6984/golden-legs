import { describe, expect, it, vi } from "vitest";
import type { EntityManager } from "@mikro-orm/postgresql";
import { pingDatabase } from "./health";

describe("pingDatabase", () => {
  it("runs a trivial query on the EntityManager's connection", async () => {
    const execute = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    const em = { getConnection: () => ({ execute }) } as unknown as EntityManager;

    await pingDatabase(em);

    expect(execute).toHaveBeenCalledWith("select 1");
  });

  it("propagates connection errors", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const em = { getConnection: () => ({ execute }) } as unknown as EntityManager;

    await expect(pingDatabase(em)).rejects.toThrow("ECONNREFUSED");
  });
});
