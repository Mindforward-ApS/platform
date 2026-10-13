import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { marketingConfig, type NurtureTemplate } from "@/lib/config/marketing";
import { serverEnv } from "@/lib/env";
import { inngest } from "@/server/jobs/client";
import { logger } from "@/server/observability/logger";
import { canSendMarketing, normalizeEmail, sha256 } from "./consent";
import { sendMarketingEmail, type MarketingResult, type MarketingSendOptions } from "./send";

// Lead nurture (docs/09 § 5): nurture-1 +1 h after the double opt-in click, nurture-2 day 3, nurture-3 day 7,
// nurture-4 day 14. Every step re-checks at send time: consent (gate in sendMarketingEmail), customer status
// (a paying customer stops all sales flows) and frequency/quiet hours. Idempotency: flow:nurture:{email}:{step}.

export const NURTURE_EVENT = "marketing/consent.confirmed";

const PATHS: Record<NurtureTemplate, string> = {
  "nurture-1": "/moduler",
  "nurture-2": "/moduler",
  "nurture-3": "/virksomhed/opret",
  "nurture-4": "/plan",
};

/** Paying (or trialing) customer → stop every sales flow immediately (docs/09 § 4). */
export async function isCustomer(db: PrismaClient, email: string): Promise<boolean> {
  const count = await db.subscription.count({
    where: {
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      organization: { members: { some: { deactivatedAt: null, user: { email: normalizeEmail(email) } } } },
    },
  });
  return count > 0;
}

export type NurtureOutcome = MarketingResult | { sent: false; reason: "CUSTOMER" };

export async function sendNurtureStep(db: PrismaClient, input: { email: string; template: NurtureTemplate }, opts: MarketingSendOptions = {}): Promise<NurtureOutcome> {
  const email = normalizeEmail(input.email);
  if (await isCustomer(db, email)) return { sent: false, reason: "CUSTOMER" };
  // The consent record id is looked up fresh each time; sendMarketingEmail re-checks it again at send time.
  const gate = await canSendMarketing(db, email, { pepper: opts.pepper });
  if (!gate.allowed) return { sent: false, reason: gate.reason };
  const consent = await db.consentRecord.findUnique({ where: { id: gate.consentRecordId }, select: { userId: true } });
  const appUrl = opts.appUrl ?? serverEnv().APP_URL;
  const url = `${appUrl}${PATHS[input.template]}`;
  const base = { to: email, consentRecordId: gate.consentRecordId, userId: consent?.userId ?? null, idempotencyKey: `flow:nurture:${email}:${input.template}` };

  switch (input.template) {
    case "nurture-1": {
      const placement = consent?.userId
        ? await db.placementResult.findFirst({ where: { userId: consent.userId }, orderBy: { createdAt: "desc" }, select: { level: true, track: { select: { displayName: true } } } })
        : null;
      return sendMarketingEmail(db, { ...base, template: "nurture-1", vars: { url, result: placement ? { track: placement.track.displayName, level: placement.level } : null } }, opts);
    }
    case "nurture-2":
      return sendMarketingEmail(db, { ...base, template: "nurture-2", vars: { url } }, opts);
    case "nurture-3":
      return sendMarketingEmail(db, { ...base, template: "nurture-3", vars: { url } }, opts);
    case "nurture-4":
      // No campaign exists in M8: an offer may only appear as copy from a validated campaign (src/lib/marketing/campaign.ts).
      return sendMarketingEmail(db, { ...base, template: "nurture-4", vars: { url, offer: null } }, opts);
  }
}

/** Stop the flow for good on these refusals; QUIET_HOURS/FREQUENCY_CAP only defer. */
export function nurtureStops(outcome: { sent: boolean; reason?: string }): boolean {
  return !outcome.sent && ["CUSTOMER", "NO_CONSENT", "NOT_CONFIRMED", "WITHDRAWN", "SUPPRESSED", "KILL_SWITCH", "NOT_ALLOWLISTED"].includes(outcome.reason ?? "");
}

export const nurtureSchedule = marketingConfig.nurture;

/**
 * After a successful double opt-in click: start the nurture flow (docs/09 § 5 trigger "consent CONFIRMED").
 * Never throws — a missing Inngest connection must not break the confirmation page; the flow re-checks
 * consent at every step anyway.
 */
export async function startNurtureForToken(db: PrismaClient, token: string): Promise<boolean> {
  const env = serverEnv();
  if (!env.INNGEST_EVENT_KEY && !env.INNGEST_DEV) {
    logger.info("marketing.nurture_not_started", { reason: "no Inngest configured" });
    return false;
  }
  try {
    const grant = await db.consentRecord.findUnique({ where: { confirmationTokenHash: sha256(token) }, select: { subjectEmail: true, confirmedAt: true, purpose: true } });
    if (!grant?.confirmedAt || grant.purpose !== "MARKETING_EMAIL") return false;
    await inngest.send({ name: NURTURE_EVENT, data: { email: grant.subjectEmail, confirmedAt: grant.confirmedAt.toISOString() } });
    return true;
  } catch (err) {
    logger.warn("marketing.nurture_start_failed", { err });
    return false;
  }
}
