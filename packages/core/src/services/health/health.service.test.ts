import { describe, expect, it, vi } from "vitest";
import { pingDatabase, type EntityManager } from "@golden-legs/db";
import { ServiceUnavailableError } from "../../http/errors";
import { HealthService } from "./health.service";

vi.mock("@golden-legs/db", () => ({ pingDatabase: vi.fn() }));

const em = {} as EntityManager;

describe("HealthService.check", () => {
  it("reports ok when the database answers", async () => {
    vi.mocked(pingDatabase).mockResolvedValueOnce();

    await expect(new HealthService({ em }).check()).resolves.toEqual({ status: "ok" });
    expect(pingDatabase).toHaveBeenCalledWith(em);
  });

  it("throws ServiceUnavailableError with the cause when the database fails", async () => {
    const cause = new Error("connect ECONNREFUSED");
    vi.mocked(pingDatabase).mockRejectedValueOnce(cause);

    const result = new HealthService({ em }).check();

    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableError);
    await expect(result).rejects.toMatchObject({ message: "Database unavailable", cause });
  });
});
