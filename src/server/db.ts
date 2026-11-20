import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";

// Runtime uses the pooled DATABASE_URL through a driver adapter (Prisma 7): Neon's adapter for Neon,
// node-postgres for plain Postgres (local tests, CI). Migrations use DATABASE_URL_UNPOOLED via prisma.config.ts.

/**
 * Prompt-text privacy (docs/02 § 7): learners' free text is omitted from EVERY query by default. Only
 * src/server/scoring/owner-feedback.ts (after an ownership check), the sandbox's own session loader and the
 * retention job opt back in with a per-query `omit: { …: false }`.
 */
export const PRIVATE_TEXT_OMIT = {
  stepResult: { promptText: true, aiFeedback: true },
  sandboxEvent: { contentText: true },
} as const;

export function createPrismaClient(connectionString: string): PrismaClient {
  const isNeon = new URL(connectionString).hostname.endsWith(".neon.tech");
  const adapter = isNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
  // The omit-typed client is invariant in its omit generic; callers keep the plain PrismaClient type, and
  // the fields are absent at runtime unless a query sets `omit: { field: false }` (tests/integration/prompt-privacy).
  return new PrismaClient({ adapter, omit: PRIVATE_TEXT_OMIT }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function db(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient(serverEnv().DATABASE_URL);
  return globalForPrisma.prisma;
}
