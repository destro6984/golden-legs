import { z } from "zod";

const MAX_PORT = 65_535;

const dbEnvSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(MAX_PORT),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
});

export type DbEnv = z.infer<typeof dbEnvSchema>;

/**
 * Validates the DB_* variables. Called on first connection, not on import:
 * `next build` imports this package without database credentials.
 * The error lists variable names and problems only, never the values.
 */
export function parseDbEnv(env: NodeJS.ProcessEnv = process.env): DbEnv {
  const result = dbEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid database environment variables (see .env.example):\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
