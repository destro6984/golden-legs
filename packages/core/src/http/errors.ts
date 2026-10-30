export type FieldErrors = Record<string, string[]>;

/** Base class for errors that services throw; `apiHandler` maps them to HTTP responses. */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(
    message: string,
    readonly fieldErrors: FieldErrors = {},
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "NOT_FOUND";
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = "CONFLICT";
}

export class ServiceUnavailableError extends AppError {
  readonly status = 503;
  readonly code = "SERVICE_UNAVAILABLE";
}
