import { describe, expect, it, vi } from "vitest";
import {
  SetupError,
  checkDocker,
  checkNodeVersion,
  ensureEnvFile,
  installDependencies,
  runMigrations,
  startDatabase,
} from "./steps.mjs";

const ok = (stdout = "") => ({ status: 0, stdout });
const failed = { status: 1, stdout: "" };
const root = "/repo";
const EXAMPLE = "DB_HOST=localhost\nDB_PASSWORD=\nDB_PORT=5433\n";
const PASSWORD = "generated-password";

function fakeFs(files: Record<string, string>) {
  return {
    existsSync: vi.fn((file: string) => file in files),
    readFileSync: vi.fn((file: string) => files[file]),
    writeFileSync: vi.fn(),
  };
}

const randomBytes = vi.fn(() => ({ toString: () => PASSWORD }));

function dockerExec(volumes: string) {
  return vi.fn((command: string, args: string[]) =>
    args[1] === "config" ? ok(JSON.stringify({ name: "golden-legs" })) : ok(volumes),
  );
}

describe("checkNodeVersion", () => {
  it("accepts the minimum and newer versions", () => {
    expect(checkNodeVersion({ current: "22.17.0", required: ">=22.17.0" })).toEqual({ skipped: false });
    expect(checkNodeVersion({ current: "24.1.0", required: ">=22.17.0" })).toEqual({ skipped: false });
  });

  it("ignores a prerelease suffix of the running version", () => {
    expect(checkNodeVersion({ current: "22.17.0-nightly20260101", required: ">=22.17.0" })).toEqual({ skipped: false });
    expect(() => checkNodeVersion({ current: "22.16.0-rc.1", required: ">=22.17.0" })).toThrow(/Wymagany/);
  });

  it.each(["^22.17.0", ">=22.17.0 <23", ">=22.17", "22.x"])("fails loudly on an unsupported range %j", (required) => {
    expect(() => checkNodeVersion({ current: "20.0.0", required })).toThrow(/Nieobsługiwany zakres engines\.node/);
  });

  it("rejects an older version with both versions in the message", () => {
    expect(() => checkNodeVersion({ current: "22.16.9", required: ">=22.17.0" })).toThrow(
      new SetupError("Wymagany Node.js >=22.17.0, a uruchomiony jest 22.16.9. Zaktualizuj Node.js."),
    );
  });
});

describe("checkDocker", () => {
  it("passes when compose and the daemon respond", () => {
    const exec = vi.fn(() => ok());

    expect(checkDocker({ exec })).toEqual({ skipped: false });
    expect(exec).toHaveBeenCalledWith("docker", ["compose", "version"], { capture: true });
    expect(exec).toHaveBeenCalledWith("docker", ["info"], { capture: true });
  });

  it("fails without Docker Compose", () => {
    expect(() => checkDocker({ exec: vi.fn(() => failed) })).toThrow(/Docker Compose/);
  });

  it("fails when the daemon is not running", () => {
    const exec = vi.fn((command: string, args: string[]) => (args[0] === "info" ? failed : ok()));

    expect(() => checkDocker({ exec })).toThrow(/demon nie działa albo brakuje uprawnień do \/var\/run\/docker\.sock/);
  });
});

describe("installDependencies", () => {
  it("runs npm install", () => {
    const exec = vi.fn(() => ok());

    expect(installDependencies({ exec })).toEqual({ skipped: false });
    expect(exec).toHaveBeenCalledWith("npm", ["install"]);
  });

  it("fails when npm fails", () => {
    expect(() => installDependencies({ exec: vi.fn(() => failed) })).toThrow(/npm install/);
  });
});

describe("ensureEnvFile", () => {
  it("skips an existing .env with a password and never touches it", () => {
    const fs = fakeFs({ "/repo/.env": "DB_PASSWORD=secret\n" });
    const exec = vi.fn();

    expect(ensureEnvFile({ exec, fs, randomBytes, root })).toEqual({ skipped: true, reason: ".env już istnieje" });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  it("accepts a quoted password", () => {
    const fs = fakeFs({ "/repo/.env": 'DB_PASSWORD="secret"\n' });

    expect(ensureEnvFile({ exec: vi.fn(), fs, randomBytes, root })).toEqual({ skipped: true, reason: ".env już istnieje" });
  });

  it("fails without changes when the existing .env has no DB_PASSWORD line", () => {
    const fs = fakeFs({ "/repo/.env": "DB_HOST=localhost\n" });

    expect(() => ensureEnvFile({ exec: vi.fn(), fs, randomBytes, root })).toThrow(/nie ma linii DB_PASSWORD/);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it.each(["DB_PASSWORD=\n", "DB_PASSWORD=   \n", 'DB_PASSWORD=""\n', "DB_PASSWORD=''\n"])(
    "fails without changes when the existing .env has no password (%j)",
    (content) => {
      const fs = fakeFs({ "/repo/.env": content });

      expect(() => ensureEnvFile({ exec: vi.fn(), fs, randomBytes, root })).toThrow(/DB_PASSWORD jest puste/);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    },
  );

  it("fails when .env.example is missing", () => {
    expect(() => ensureEnvFile({ exec: vi.fn(), fs: fakeFs({}), randomBytes, root })).toThrow(/\.env\.example/);
  });

  it("creates .env from the example with a random password, privately and without overwriting", () => {
    const fs = fakeFs({ "/repo/.env.example": EXAMPLE });
    const exec = dockerExec("");

    expect(ensureEnvFile({ exec, fs, randomBytes, root })).toEqual({ skipped: false });
    expect(randomBytes).toHaveBeenCalledWith(24);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/repo/.env",
      `DB_HOST=localhost\nDB_PASSWORD=${PASSWORD}\nDB_PORT=5433\n`,
      { flag: "wx", mode: 0o600 },
    );
    expect(exec).toHaveBeenCalledWith(
      "docker",
      [
        "volume", "ls", "-q",
        "--filter", "label=com.docker.compose.project=golden-legs",
        "--filter", "label=com.docker.compose.volume=postgres-data",
      ],
      { capture: true },
    );
  });

  it("appends the password when the example has no DB_PASSWORD line", () => {
    const fs = fakeFs({ "/repo/.env.example": "DB_HOST=localhost\n" });

    ensureEnvFile({ exec: dockerExec(""), fs, randomBytes, root });

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/repo/.env",
      `DB_HOST=localhost\nDB_PASSWORD=${PASSWORD}\n`,
      expect.anything(),
    );
  });

  it("refuses to create .env when the database volume already exists", () => {
    const fs = fakeFs({ "/repo/.env.example": EXAMPLE });

    expect(() => ensureEnvFile({ exec: dockerExec("golden-legs_postgres-data\n"), fs, randomBytes, root })).toThrow(
      /docker compose down -v/,
    );
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("fails before writing when the volume list cannot be read", () => {
    const fs = fakeFs({ "/repo/.env.example": EXAMPLE });
    const exec = vi.fn((command: string, args: string[]) =>
      args[1] === "config" ? ok(JSON.stringify({ name: "golden-legs" })) : failed,
    );

    expect(() => ensureEnvFile({ exec, fs, randomBytes, root })).toThrow(/docker volume ls/);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it.each(["WARN: not json", "{}", '{"name":""}'])("fails cleanly without a project name in compose output (%j)", (output) => {
    const fs = fakeFs({ "/repo/.env.example": EXAMPLE });

    expect(() => ensureEnvFile({ exec: vi.fn(() => ok(output)), fs, randomBytes, root })).toThrow(
      new SetupError("Nie udało się odczytać nazwy projektu z docker compose config. Zaktualizuj Docker Compose."),
    );
  });

  it("reports a .env created in the meantime instead of overwriting it", () => {
    const fs = fakeFs({ "/repo/.env.example": EXAMPLE });
    fs.writeFileSync.mockImplementation(() => {
      throw Object.assign(new Error("exists"), { code: "EEXIST" });
    });

    expect(() => ensureEnvFile({ exec: dockerExec(""), fs, randomBytes, root })).toThrow(/powstał w trakcie/);
  });

  it("rethrows other write errors", () => {
    const fs = fakeFs({ "/repo/.env.example": EXAMPLE });
    fs.writeFileSync.mockImplementation(() => {
      throw Object.assign(new Error("read-only"), { code: "EROFS" });
    });

    expect(() => ensureEnvFile({ exec: dockerExec(""), fs, randomBytes, root })).toThrow("read-only");
  });

  it("fails when docker compose cannot read the configuration", () => {
    const fs = fakeFs({ "/repo/.env.example": EXAMPLE });

    expect(() => ensureEnvFile({ exec: vi.fn(() => failed), fs, randomBytes, root })).toThrow(/compose\.yaml/);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("database steps", () => {
  it("starts the database with npm run db:up", () => {
    const exec = vi.fn(() => ok());

    expect(startDatabase({ exec })).toEqual({ skipped: false });
    expect(exec).toHaveBeenCalledWith("npm", ["run", "db:up"]);
  });

  it("points at DB_PORT when the database does not start", () => {
    expect(() => startDatabase({ exec: vi.fn(() => failed) })).toThrow(/DB_PORT/);
  });

  it("runs migrations with npm run db:migrate", () => {
    const exec = vi.fn(() => ok());

    expect(runMigrations({ exec })).toEqual({ skipped: false });
    expect(exec).toHaveBeenCalledWith("npm", ["run", "db:migrate"]);
  });

  it("explains the password mismatch when migrations fail", () => {
    expect(() => runMigrations({ exec: vi.fn(() => failed) })).toThrow(/docker compose down -v/);
  });
});
