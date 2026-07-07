// ────────────────────────────────
// Prisma Client Singleton
// ARCHITECTURE.md Section 8 — prevents connection exhaustion in dev (hot reload)
// CODING_STANDARD.md Section 9 — only Repository files import PrismaClient
// Prisma v7 adapter pattern — uses @prisma/adapter-pg for PostgreSQL
// ────────────────────────────────

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
