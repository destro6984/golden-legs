export const APP_NAME = "GoldenLegs";

export type { Cradle } from "./container/cradle";
export { getContainer, withScope, type AppContainer } from "./container/container";
export { logger } from "./logger";
export { apiHandler, type ApiError, type ApiResult } from "./http/apiHandler";
export {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
  type FieldErrors,
} from "./http/errors";
export { HealthService, type HealthStatus } from "./services/health/health.service";
