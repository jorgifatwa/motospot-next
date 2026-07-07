import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  {
    rules: {
      // CODING_STANDARD.md Section 4 — No `any`
      "@typescript-eslint/no-explicit-any": "error",
      // CODING_STANDARD.md Section 12 — No commented-out dead code
      "no-warning-comments": ["warn", { terms: ["todo", "fixme", "xxx"], location: "anywhere" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "prisma/migrations/**"]),
]);

export default eslintConfig;
