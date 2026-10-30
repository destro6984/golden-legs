import { describe, expect, it, vi } from "vitest";
import { runSetup } from "./run-setup.mjs";

const PACKAGE_JSON = JSON.stringify({ engines: { node: ">=22.17.0" } });

function fakeSystem({ files = {}, exec = vi.fn(() => ({ status: 0, stdout: "" })), nodeVersion = "24.0.0" } = {}) {
  const all: Record<string, string> = { "/repo/package.json": PACKAGE_JSON, ...files };
  return {
    root: "/repo",
    nodeVersion,
    exec,
    log: vi.fn(),
    randomBytes: vi.fn(() => ({ toString: () => "generated" })),
    fs: {
      existsSync: vi.fn((file: string) => file in all),
      readFileSync: vi.fn((file: string) => all[file]),
      writeFileSync: vi.fn(),
    },
  };
}

function logged(system: ReturnType<typeof fakeSystem>) {
  return system.log.mock.calls.map(([line]) => line);
}

describe("runSetup", () => {
  it("runs every step on a fresh clone and finishes with the next command", () => {
    const exec = vi.fn((command: string, args: string[]) =>
      args[1] === "config" ? { status: 0, stdout: '{"name":"golden-legs"}' } : { status: 0, stdout: "" },
    );
    const system = fakeSystem({ files: { "/repo/.env.example": "DB_PASSWORD=\n" }, exec });

    expect(runSetup(system)).toBe(0);
    expect(logged(system)).toEqual([
      "✓ Node.js",
      "✓ Docker",
      "✓ Zależności npm",
      "✓ Plik .env",
      "✓ PostgreSQL",
      "✓ Migracje",
      "Gotowe. Uruchom aplikację: npm run dev",
    ]);
    expect(system.fs.writeFileSync).toHaveBeenCalledOnce();
  });

  it("skips the existing .env on a second run and leaves it untouched", () => {
    const system = fakeSystem({ files: { "/repo/.env": "DB_PASSWORD=secret\n" } });

    expect(runSetup(system)).toBe(0);
    expect(logged(system)).toContain("↷ Plik .env — pominięto (.env już istnieje)");
    expect(system.fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("stops at the first failing step before anything changes", () => {
    const system = fakeSystem({ nodeVersion: "20.0.0" });

    expect(runSetup(system)).toBe(1);
    expect(logged(system)).toEqual([expect.stringMatching(/^✗ Node\.js — Wymagany Node\.js >=22\.17\.0/)]);
    expect(system.exec).not.toHaveBeenCalled();
    expect(system.fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors instead of hiding them", () => {
    const system = fakeSystem({
      exec: vi.fn(() => {
        throw new TypeError("boom");
      }),
    });

    expect(() => runSetup(system)).toThrow("boom");
  });
});
