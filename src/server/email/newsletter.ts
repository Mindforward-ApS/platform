import "server-only";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { monthKey } from "@/server/modules/monthly-clock";
import { logger } from "@/server/observability/logger";
import { canSendMarketing } from "./consent";
import { sendMarketingEmail, type MarketingRefusal, type MarketingSendOptions } from "./send";

// Newsletter (docs/09 § 3, § 5): manual, max 1/month, only after Marco approved the draft. Recipients are every
// address whose LATEST marketing consent row is CONFIRMED; each mail still passes the full send-time gate.

const httpsUrl = z.url().refine((u) => /^https?:\/\//.test(u), "skal være en http(s)-URL");

export const newsletterDraftSchema = z
  .object({
    subject: z.string().min(5).max(120),
    heading: z.string().min(3).max(120),
    intro: z.string().min(10).max(2000),
    items: z.array(z.object({ title: z.string().min(3).max(120), summary: z.string().min(10).max(600), url: httpsUrl })).min(1).max(8),
    /** Link at the bottom (e.g. the module list). */
    url: httpsUrl,
    /** Manual approval (docs/09 § 5): who approved the exact draft, and when. */
    approvedBy: z.string().min(2),
    approvedAt: z.coerce.date(),
  })
  .strict();

export type NewsletterDraft = z.infer<typeof newsletterDraftSchema>;

/** Addresses that ever CONFIRMED marketing consent; the gate (canSendMarketing) decides per address below. */
export async function confirmedMarketingAddresses(db: PrismaClient): Promise<string[]> {
  const rows = await db.consentRecord.findMany({ where: { purpose: "MARKETING_EMAIL", channel: "EMAIL", action: "CONFIRMED" }, distinct: ["subjectEmail"], select: { subjectEmail: true }, orderBy: { subjectEmail: "asc" } });
  return rows.map((r) => r.subjectEmail);
}

export interface NewsletterRun {
  month: string;
  sent: number;
  alreadySent: number;
  refused: Partial<Record<MarketingRefusal, number>>;
}

export async function sendNewsletter(db: PrismaClient, input: unknown, opts: MarketingSendOptions = {}): Promise<NewsletterRun> {
  const draft = newsletterDraftSchema.parse(input);
  const now = opts.now ?? new Date();
  const month = monthKey(now);
  const run: NewsletterRun = { month, sent: 0, alreadySent: 0, refused: {} };
  const appUrl = opts.appUrl ?? serverEnv().APP_URL;
  for (const email of await confirmedMarketingAddresses(db)) {
    const gate = await canSendMarketing(db, email, { pepper: opts.pepper });
    if (!gate.allowed) {
      run.refused[gate.reason] = (run.refused[gate.reason] ?? 0) + 1;
      continue;
    }
    const consent = await db.consentRecord.findUniqueOrThrow({ where: { id: gate.consentRecordId }, select: { id: true, userId: true } });
    const result = await sendMarketingEmail(
      db,
      {
        template: "newsletter",
        to: email,
        consentRecordId: consent.id,
        userId: consent.userId,
        idempotencyKey: `newsletter:${month}:${email}`,
        vars: { url: draft.url, subject: draft.subject, heading: draft.heading, intro: draft.intro, items: draft.items },
      },
      { ...opts, now, appUrl },
    );
    if (result.sent && result.duplicate) run.alreadySent++;
    else if (result.sent) run.sent++;
    else run.refused[result.reason] = (run.refused[result.reason] ?? 0) + 1;
  }
  logger.info("marketing.newsletter_run", { month, sent: run.sent, alreadySent: run.alreadySent, refused: run.refused, approvedBy: draft.approvedBy });
  return run;
}
