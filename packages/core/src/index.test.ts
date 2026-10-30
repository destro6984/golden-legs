import { describe, expect, it, vi } from "vitest";
import * as core from "./index";

vi.mock("@golden-legs/db", () => ({ getOrm: vi.fn(), pingDatabase: vi.fn() }));

describe("@golden-legs/core public API", () => {
  it("exposes the app name", () => {
    expect(core.APP_NAME).toBe("GoldenLegs");
  });

  it("exports the container, HTTP layer, logger and services", () => {
    expect(Object.keys(core)).toEqual(
      expect.arrayContaining([
        "getContainer",
        "withScope",
        "logger",
        "apiHandler",
        "AppError",
        "NotFoundError",
        "ValidationError",
        "HealthService",
      ]),
    );
  });
});
