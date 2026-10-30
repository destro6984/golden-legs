import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";

// Same image as compose.yaml, so tests run against the PostgreSQL used in development.
const POSTGRES_IMAGE = "postgres:18-alpine";
const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");
const APP_DIR = path.join(REPO_ROOT, "packages/app");
const NEXT_BIN = path.join(REPO_ROOT, "node_modules/next/dist/bin/next");
const STARTUP_TIMEOUT_MS = 60_000;
const HEALTH_POLL_INTERVAL_MS = 250;

const execFileAsync = promisify(execFile);

export type EphemeralApp = {
  url: string;
  stop: () => Promise<void>;
};

/**
 * Starts a throwaway PostgreSQL container, applies migrations and runs the built
 * app (`next start`) against it on a free port. Requires `npm run build` first.
 */
export async function startEphemeralApp(): Promise<EphemeralApp> {
  if (!existsSync(path.join(APP_DIR, ".next/BUILD_ID"))) {
    throw new Error("No production build found. Run `npm run build` first.");
  }

  const db = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  try {
    // Values passed here win over the root env file loaded by next.config.ts.
    const env = { ...process.env, ...databaseEnv(db) };
    await execFileAsync("npm", ["run", "migration:up", "-w", "@golden-legs/db"], { cwd: REPO_ROOT, env });

    const port = await findFreePort();
    const server = spawn(process.execPath, [NEXT_BIN, "start", "--port", String(port)], {
      cwd: APP_DIR,
      env,
      stdio: ["ignore", "ignore", "inherit"],
    });
    const url = `http://127.0.0.1:${port}`;
    await waitUntilHealthy(url, server);

    return {
      url,
      stop: async () => {
        await stopProcess(server);
        await db.stop();
      },
    };
  } catch (error) {
    await db.stop();
    throw error;
  }
}

function databaseEnv(db: StartedPostgreSqlContainer): Record<string, string> {
  return {
    DB_HOST: db.getHost(),
    DB_PORT: String(db.getPort()),
    DB_NAME: db.getDatabase(),
    DB_USER: db.getUsername(),
    DB_PASSWORD: db.getPassword(),
  };
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitUntilHealthy(url: string, server: ChildProcess): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`App exited during startup with code ${server.exitCode}`);
    }
    if (await isHealthy(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_INTERVAL_MS));
  }
  await stopProcess(server);
  throw new Error(`App did not become healthy within ${STARTUP_TIMEOUT_MS} ms`);
}

async function isHealthy(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/health`);
    return response.ok;
  } catch {
    // Not listening yet; the caller polls again.
    return false;
  }
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await exited;
}
