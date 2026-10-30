import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// One env file for the whole monorepo, at the repository root. Next.js
// itself only reads env files from packages/app.
loadEnvConfig(path.resolve(import.meta.dirname, "../.."), process.env.NODE_ENV !== "production");

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source, so Next.js compiles them.
  transpilePackages: ["@golden-legs/core", "@golden-legs/db", "@golden-legs/ui"],
  // Loaded with Node.js require instead of bundled; @mikro-orm/core and pg
  // are already on Next.js's built-in list.
  serverExternalPackages: ["@mikro-orm/postgresql", "@mikro-orm/sql", "@mikro-orm/migrations"],
  experimental: {
    agentFeedback: true,
  },
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
