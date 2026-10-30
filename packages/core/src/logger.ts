import pino from "pino";

// Field names that may carry credentials, at the top level and one level deep.
const SENSITIVE_FIELDS = ["password", "token", "accessToken", "refreshToken", "authorization", "cookie"];

export const logger = pino({
  redact: {
    paths: SENSITIVE_FIELDS.flatMap((field) => [field, `*.${field}`]),
    censor: "[redacted]",
  },
});
