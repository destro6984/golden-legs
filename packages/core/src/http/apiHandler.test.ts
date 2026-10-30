import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { apiHandler } from "./apiHandler";
import { NotFoundError, ServiceUnavailableError, ValidationError } from "./errors";

vi.mock("../logger", () => ({ logger: { error: vi.fn() } }));

const request = new Request("http://localhost/api/things?page=2", { method: "POST" });

beforeEach(() => {
  vi.mocked(logger.error).mockClear();
});

describe("apiHandler", () => {
  it("wraps the handler result in a success envelope", async () => {
    const handler = apiHandler(async () => ({ id: 1 }));

    const response = await handler(request, undefined);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { id: 1 } });
  });

  it("passes the request and context to the handler", async () => {
    const inner = vi.fn(async () => null);
    const context = { params: Promise.resolve({ id: "7" }) };

    await apiHandler(inner)(request, context);

    expect(inner).toHaveBeenCalledWith(request, context);
  });

  it("maps a client AppError to its status and code without logging", async () => {
    const handler = apiHandler(async () => {
      throw new NotFoundError("Thing not found");
    });

    const response = await handler(request, undefined);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Thing not found" },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("includes field errors for a ValidationError", async () => {
    const handler = apiHandler(async () => {
      throw new ValidationError("Invalid input", { name: ["Required"] });
    });

    const response = await handler(request, undefined);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid input", fieldErrors: { name: ["Required"] } },
    });
  });

  it("logs a server-side AppError with the route", async () => {
    const error = new ServiceUnavailableError("Database unavailable");
    const handler = apiHandler(async () => {
      throw error;
    });

    const response = await handler(request, undefined);

    expect(response.status).toBe(503);
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, method: "POST", path: "/api/things" },
      "Database unavailable",
    );
  });

  it("hides unexpected errors behind a generic 500 and logs them", async () => {
    const error = new Error("secret internals");
    const handler = apiHandler(async () => {
      throw error;
    });

    const response = await handler(request, undefined);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, method: "POST", path: "/api/things" },
      "Unhandled error in route handler",
    );
  });
});
