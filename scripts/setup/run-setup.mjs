// Runs the setup steps in order, stops at the first failure and returns the exit code.

import path from "node:path";
import {
  checkDocker,
  checkNodeVersion,
  ensureEnvFile,
  installDependencies,
  runMigrations,
  SetupError,
  startDatabase,
} from "./steps.mjs";

export function runSetup(system) {
  const { engines } = JSON.parse(system.fs.readFileSync(path.join(system.root, "package.json"), "utf8"));
  const steps = [
    ["Node.js", () => checkNodeVersion({ current: system.nodeVersion, required: engines.node })],
    ["Docker", () => checkDocker(system)],
    ["Zależności npm", () => installDependencies(system)],
    ["Plik .env", () => ensureEnvFile(system)],
    ["PostgreSQL", () => startDatabase(system)],
    ["Migracje", () => runMigrations(system)],
  ];

  for (const [name, run] of steps) {
    try {
      const result = run();
      system.log(result.skipped ? `↷ ${name} — pominięto (${result.reason})` : `✓ ${name}`);
    } catch (error) {
      if (!(error instanceof SetupError)) {
        throw error;
      }
      system.log(`✗ ${name} — ${error.message}`);
      return 1;
    }
  }

  system.log("Gotowe. Uruchom aplikację: npm run dev");
  return 0;
}
