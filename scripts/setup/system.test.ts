import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSystem } from "./system.mjs";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));

const spawn = vi.mocked(spawnSync);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createSystem", () => {
  it("points at the repository root and the running Node.js", () => {
    const system = createSystem();

    expect(system.root).toMatch(/\/$/);
    expect(system.root).not.toMatch(/scripts\/$/);
    expect(system.nodeVersion).toBe(process.versions.node);
  });

  it("runs commands in the repository root with visible output by default", () => {
    spawn.mockReturnValue({ status: 0, stdout: null } as never);
    const system = createSystem();

    expect(system.exec("npm", ["install"])).toEqual({ status: 0, stdout: "" });
    expect(spawn).toHaveBeenCalledWith("npm", ["install"], { cwd: system.root, encoding: "utf8", stdio: "inherit" });
  });

  it("captures stdout when asked", () => {
    spawn.mockReturnValue({ status: 0, stdout: "out" } as never);

    expect(createSystem().exec("docker", ["info"], { capture: true })).toEqual({ status: 0, stdout: "out" });
    expect(spawn).toHaveBeenLastCalledWith("docker", ["info"], expect.objectContaining({ stdio: ["ignore", "pipe", "ignore"] }));
  });

  it("treats a command that could not start as failed", () => {
    spawn.mockReturnValue({ status: null, stdout: null } as never);

    expect(createSystem().exec("docker", ["info"], { capture: true }).status).toBe(1);
  });

  it("logs to the console", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    createSystem().log("line");

    expect(log).toHaveBeenCalledWith("line");
  });
});
