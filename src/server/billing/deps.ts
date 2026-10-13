import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import type { ServerEnv } from "@/lib/env.schema";
import { db } from "@/server/db";
import { getStripe, type StripeGateway } from "./stripe";

/** Everything billing logic touches, injectable so integration tests can use the fake Stripe + test DB. */
export interface BillingDeps {
  db: PrismaClient;
  stripe: StripeGateway;
  env: ServerEnv;
  now?: () => Date;
}

export function billingDeps(): BillingDeps {
  return { db: db(), stripe: getStripe(), env: serverEnv() };
}

export function nowOf(deps: BillingDeps): Date {
  return deps.now ? deps.now() : new Date();
}
