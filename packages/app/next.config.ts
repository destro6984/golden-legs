import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// One env file for the whole monorepo, at the repository root. Next.js only
// reads env files from packages/app, and @next/env's loadEnvConfig() caches
// its first call, so Node's own loader is used instead.
const rootEnvFile = path.resolve(import.meta.dirname, "../../.env");
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source, so Next.js compiles them.
  transpilePackages: ["@golden-legs/core", "@golden-legs/db", "@golden-legs/ui"],
  // Loaded with Node.js require instead of bundled; @mikro-orm/core and pg
  // are already on Next.js's built-in list.
  serverExternalPackages: ["@mikro-orm/postgresql", "@mikro-orm/sql", "@mikro-orm/migrations"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
