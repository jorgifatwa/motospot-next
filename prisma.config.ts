// ────────────────────────────────
// Prisma v7 Configuration
// Prisma v7 requires a config file for datasource URL (no longer in schema.prisma)
// ────────────────────────────────

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
