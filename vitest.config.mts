import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// Unit tests: *.test.ts(x) next to the code. Integration tests (*.int.test.ts)
// run separately through vitest.integration.config.mts.
export default defineConfig({
  resolve: {
    // The `@/` alias of packages/app (tsconfig paths).
    alias: { "@": path.resolve(import.meta.dirname, "packages/app") },
  },
  test: {
    include: ["packages/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/*.int.test.ts", "**/.next/**"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}", "packages/app/app/**/*.{ts,tsx}", "scripts/**/*.mjs"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts", "packages/db/src/migrations/**"],
      // Every source file must be fully covered (AGENTS.md, "Testy").
      thresholds: { 100: true },
    },
  },
});
