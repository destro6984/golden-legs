import { logger } from "../logger";
import { AppError, ValidationError, type FieldErrors } from "./errors";

export type ApiError = { code: string; message: string; fieldErrors?: FieldErrors };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const SERVER_ERROR_STATUS = 500;

/**
 * Wraps a Route Handler: returns `{ ok: true, data }` on success and maps thrown
 * errors to `{ ok: false, error }` with the matching status. Routes never write
 * their own try/catch.
 */
export function apiHandler<Context, Data>(
  handler: (request: Request, context: Context) => Promise<Data>,
): (request: Request, context: Context) => Promise<Response> {
  return async (request, context) => {
    try {
      const data = await handler(request, context);
      return Response.json({ ok: true, data } satisfies ApiResult<Data>);
    } catch (error) {
      return errorResponse(error, request);
    }
  };
}

function errorResponse(error: unknown, request: Request): Response {
  const route = { method: request.method, path: new URL(request.url).pathname };

  if (!(error instanceof AppError)) {
    logger.error({ err: error, ...route }, "Unhandled error in route handler");
    return json({ code: "INTERNAL_ERROR", message: "Internal server error" }, SERVER_ERROR_STATUS);
  }

  if (error.status >= SERVER_ERROR_STATUS) {
    logger.error({ err: error, ...route }, error.message);
  }
  const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
  return json({ code: error.code, message: error.message, fieldErrors }, error.status);
}

function json(error: ApiError, status: number): Response {
  return Response.json({ ok: false, error } satisfies ApiResult<never>, { status });
}
