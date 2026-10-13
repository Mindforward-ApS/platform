import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";

// Runtime uses the pooled DATABASE_URL through a driver adapter (Prisma 7): Neon's adapter for Neon,
// node-postgres for plain Postgres (local tests, CI). Migrations use DATABASE_URL_UNPOOLED via prisma.config.ts.

export function createPrismaClient(connectionString: string): PrismaClient {
  const isNeon = new URL(connectionString).hostname.endsWith(".neon.tech");
  const adapter = isNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function db(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient(serverEnv().DATABASE_URL);
  return globalForPrisma.prisma;
}
