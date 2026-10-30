import pino, { type DestinationStream, type Logger } from "pino";

// Field names that may carry credentials, at the top level and one level deep.
const SENSITIVE_FIELDS = ["password", "token", "accessToken", "refreshToken", "authorization", "cookie"];

export function createLogger(destination?: DestinationStream): Logger {
  const options = {
    redact: {
      paths: SENSITIVE_FIELDS.flatMap((field) => [field, `*.${field}`]),
      censor: "[redacted]",
    },
  };
  return destination ? pino(options, destination) : pino(options);
}

export const logger = createLogger();
