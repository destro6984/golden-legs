import { describe, expect, it, vi } from "vitest";
import { connection } from "next/server";
import { ServiceUnavailableError, withScope, type Cradle } from "@golden-legs/core";
import { GET } from "./route";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@golden-legs/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@golden-legs/core")>()),
  withScope: vi.fn(),
}));

function scopeWith(check: () => Promise<unknown>) {
  vi.mocked(withScope).mockImplementationOnce(async (work) =>
    work({ healthService: { check } } as unknown as Cradle),
  );
}

const request = new Request("http://localhost/api/health");

describe("GET /api/health", () => {
  it("opts into request-time rendering and returns the health status", async () => {
    scopeWith(async () => ({ status: "ok" }));

    const response = await GET(request, undefined);

    expect(connection).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok" } });
  });

  it("returns 503 when the database is unavailable", async () => {
    scopeWith(async () => {
      throw new ServiceUnavailableError("Database unavailable");
    });

    const response = await GET(request, undefined);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "SERVICE_UNAVAILABLE" } });
  });
});
