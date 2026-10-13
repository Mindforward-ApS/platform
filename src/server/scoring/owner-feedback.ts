import "server-only";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { AttemptError } from "@/server/modules/attempt-rules";
import type { OwnerFeedback } from "@/server/modules/sanitize";

// The ONLY reader of StepResult.promptText / aiFeedback (docs/02 § 7). Everything else gets them omitted by the
// global PrismaClient omit in src/server/db.ts. Admins, reports and support never call this.

const storedFeedbackSchema = z.object({
  overallFeedback: z.string().optional(),
  criteria: z.record(z.string(), z.string()).optional(),
});

export function encodeOwnerFeedback(feedback: OwnerFeedback): string {
  return JSON.stringify(feedback);
}

export function decodeOwnerFeedback(raw: string | null): OwnerFeedback | undefined {
  if (!raw) return undefined;
  try {
    const parsed = storedFeedbackSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export interface OwnerStepText {
  promptText: string | null;
  feedback: OwnerFeedback | undefined;
  purged: boolean;
}

/** Free text of an attempt for its owner only. Throws NOT_FOUND for anyone else (no existence leak). */
export async function readOwnerStepTexts(db: PrismaClient, ownerUserId: string, attemptId: string): Promise<Map<string, OwnerStepText>> {
  const attempt = await db.attempt.findUnique({ where: { id: attemptId }, select: { userId: true } });
  if (!attempt || attempt.userId !== ownerUserId) throw new AttemptError("NOT_FOUND");
  const rows = await db.stepResult.findMany({
    where: { attemptId, attempt: { userId: ownerUserId } },
    select: { stepId: true, promptText: true, aiFeedback: true, promptTextPurgedAt: true },
  });
  return new Map(rows.map((r) => [r.stepId, { promptText: r.promptText, feedback: decodeOwnerFeedback(r.aiFeedback), purged: r.promptTextPurgedAt !== null }]));
}
