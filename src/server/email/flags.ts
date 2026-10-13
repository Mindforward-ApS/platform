import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";

// Marketing kill switch (docs/09 § 2.1, § 8): FeatureFlag row MARKETING_EMAIL_ENABLED wins; env is the fallback.
// Cached ≤ 60 s (docs/03 § 12) so a flip takes effect within a minute without a deploy.

export const MARKETING_FLAG = "MARKETING_EMAIL_ENABLED";
const TTL_MS = 60_000;
let cache: { value: boolean | undefined; at: number } | null = null;

export async function marketingEnabled(db: PrismaClient, opts: { envValue?: boolean; nowMs?: number; noCache?: boolean } = {}): Promise<boolean> {
  const nowMs = opts.nowMs ?? Date.now();
  if (opts.noCache || !cache || nowMs - cache.at > TTL_MS) {
    const row = await db.featureFlag.findUnique({ where: { key: MARKETING_FLAG }, select: { enabled: true } });
    cache = { value: row?.enabled, at: nowMs };
  }
  return cache.value ?? opts.envValue ?? serverEnv().MARKETING_EMAIL_ENABLED;
}

export function resetMarketingFlagCache(): void {
  cache = null;
}
