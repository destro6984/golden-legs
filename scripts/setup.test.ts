import { afterEach, expect, it, vi } from "vitest";
import { runSetup } from "./setup/run-setup.mjs";

const system = { root: "/repo" };

vi.mock("./setup/system.mjs", () => ({ createSystem: () => system }));
vi.mock("./setup/run-setup.mjs", () => ({ runSetup: vi.fn(() => 1) }));

afterEach(() => {
  process.exitCode = undefined;
});

it("runs the setup on the real system and exits with its code", async () => {
  await import("./setup.mjs");

  expect(runSetup).toHaveBeenCalledWith(system);
  expect(process.exitCode).toBe(1);
});
