import { describe, expect, it } from "vitest";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

describe("AppError subclasses", () => {
  it.each([
    [UnauthorizedError, 401, "UNAUTHORIZED"],
    [ForbiddenError, 403, "FORBIDDEN"],
    [NotFoundError, 404, "NOT_FOUND"],
    [ConflictError, 409, "CONFLICT"],
    [ServiceUnavailableError, 503, "SERVICE_UNAVAILABLE"],
  ])("%o maps to status %i and code %s", (ErrorClass, status, code) => {
    const error = new ErrorClass("message");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message).toBe("message");
    expect(error.name).toBe(ErrorClass.name);
  });

  it("keeps the original cause", () => {
    const cause = new Error("connection refused");

    expect(new ServiceUnavailableError("Database unavailable", { cause }).cause).toBe(cause);
  });
});

describe("ValidationError", () => {
  it("maps to 400 with field errors", () => {
    const error = new ValidationError("Invalid input", { email: ["Required"] });

    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.fieldErrors).toEqual({ email: ["Required"] });
  });

  it("defaults to no field errors and keeps the cause", () => {
    const cause = new Error("parse failed");
    const error = new ValidationError("Invalid input", undefined, { cause });

    expect(error.fieldErrors).toEqual({});
    expect(error.cause).toBe(cause);
  });
});
