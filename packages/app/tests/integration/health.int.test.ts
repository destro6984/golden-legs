import { expect, inject, test } from "vitest";

test("GET /api/health reports a reachable database", async () => {
  const response = await fetch(`${inject("baseUrl")}/api/health`);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, data: { status: "ok" } });
});
