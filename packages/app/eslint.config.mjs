import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Package boundaries: app → core → db. Data access goes through core services.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@golden-legs/db", "@mikro-orm/*"],
              message: "app reaches the database only through @golden-legs/core services.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
