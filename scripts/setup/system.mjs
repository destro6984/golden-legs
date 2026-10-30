// Real side effects for the setup steps; tests replace them with mocks.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export function createSystem() {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  return {
    root,
    fs,
    randomBytes,
    nodeVersion: process.versions.node,
    log: (line) => console.log(line),
    // capture: read stdout for a decision; otherwise the user sees the command's output.
    exec: (command, args, { capture = false } = {}) => {
      const result = spawnSync(command, args, {
        cwd: root,
        encoding: "utf8",
        stdio: capture ? ["ignore", "pipe", "ignore"] : "inherit",
      });
      return { status: result.status ?? 1, stdout: result.stdout ?? "" };
    },
  };
}
