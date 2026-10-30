import { defineConfig } from "vitest/config";

const TEST_TIMEOUT_MS = 30_000;

// Integration tests run against a real app instance (next start) backed by a
// throwaway PostgreSQL container; see packages/app/tests/support/ephemeral-app.ts.
export default defineConfig({
  test: {
    include: ["packages/app/tests/integration/**/*.int.test.ts"],
    globalSetup: ["packages/app/tests/integration/global-setup.ts"],
    testTimeout: TEST_TIMEOUT_MS,
  },
});
