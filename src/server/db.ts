import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";

// Runtime uses the pooled DATABASE_URL through the Neon driver adapter (Prisma 7).
// Migrations use DATABASE_URL_UNPOOLED via prisma.config.ts.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: serverEnv().DATABASE_URL });
  return new PrismaClient({ adapter });
}

export function db(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}
