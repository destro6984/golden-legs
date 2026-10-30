import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

// Package boundaries: app → core → db, ui is imported by app only.
// packages/app has its own config (eslint-config-next) with its own boundary rule.
function forbidImports(group, message) {
  return { "no-restricted-imports": ["error", { patterns: [{ group, message }] }] };
}

export default defineConfig([
  globalIgnores(["packages/app/**", "packages/db/src/migrations/**"]),
  ...tseslint.configs.recommended,
  {
    files: ["packages/core/**/*.ts"],
    rules: forbidImports(
      ["@golden-legs/app", "@golden-legs/ui", "next", "next/*", "react", "react-dom", "@mikro-orm/*"],
      "core imports only @golden-legs/db and framework-agnostic libraries; ORM types come from @golden-legs/db.",
    ),
  },
  {
    files: ["packages/db/**/*.ts"],
    rules: forbidImports(
      ["@golden-legs/*", "next", "next/*", "react", "react-dom", "awilix"],
      "db is the bottom layer: it imports no other workspace package, framework or DI container.",
    ),
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: forbidImports(
      ["@golden-legs/*", "@mikro-orm/*"],
      "ui is presentation only: it gets data through props and imports no other workspace package.",
    ),
  },
]);
