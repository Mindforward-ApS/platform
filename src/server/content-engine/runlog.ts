import type { PipelineRunKind, PipelineRunStatus, Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ContentModelUsage } from "./model";

// PipelineRun log (docs/06 § 0): every step with status/timing/error, tokens, cost, prompt versions, model ids and
// verify reports. Appends are single atomic UPDATEs, so parallel change-process functions never lose a step.

export interface StepLog {
  step: string;
  status: "ok" | "skipped" | "failed" | "info";
  at: string;
  changeEventId?: string;
  detail?: Prisma.InputJsonValue;
}

/** Idempotent: the same key returns the existing run (`created: false`). */
export async function startRun(db: PrismaClient, opts: { kind: PipelineRunKind; idempotencyKey: string; sourceId?: string | null }) {
  const existing = await db.pipelineRun.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
  if (existing) return { run: existing, created: false };
  try {
    const run = await db.pipelineRun.create({ data: { kind: opts.kind, idempotencyKey: opts.idempotencyKey, sourceId: opts.sourceId ?? null, steps: [] } });
    return { run, created: true };
  } catch {
    // Lost a race on the unique key.
    return { run: await db.pipelineRun.findUniqueOrThrow({ where: { idempotencyKey: opts.idempotencyKey } }), created: false };
  }
}

export async function logStep(db: PrismaClient, runId: string, entry: Omit<StepLog, "at">) {
  const value = JSON.stringify([{ ...entry, at: new Date().toISOString() }]);
  await db.$executeRaw`UPDATE pipeline_run SET steps = COALESCE(steps, '[]'::jsonb) || ${value}::jsonb WHERE id = ${runId}`;
}

/** Adds tokens/cost and merges prompt versions + model ids (feature → value) into the run. */
export async function logModelCall(db: PrismaClient, runId: string, c: { feature: string; promptVersion: string; modelId: string; usage?: ContentModelUsage }) {
  const prompts = JSON.stringify({ [c.feature]: c.promptVersion });
  const models = JSON.stringify({ [c.feature]: c.modelId });
  await db.$executeRaw`UPDATE pipeline_run SET
    "tokensIn" = "tokensIn" + ${Math.round(c.usage?.tokensIn ?? 0)}::int,
    "tokensOut" = "tokensOut" + ${Math.round(c.usage?.tokensOut ?? 0)}::int,
    "costDkk" = "costDkk" + ${String(c.usage?.costDkk ?? 0)}::numeric,
    "promptVersions" = COALESCE("promptVersions", '{}'::jsonb) || ${prompts}::jsonb,
    "modelIds" = COALESCE("modelIds", '{}'::jsonb) || ${models}::jsonb
    WHERE id = ${runId}`;
}

/** Keeps the latest verify report per change event on the run. */
export async function logVerifyReport(db: PrismaClient, runId: string, changeEventId: string, report: unknown) {
  const value = JSON.stringify({ [changeEventId]: report });
  await db.$executeRaw`UPDATE pipeline_run SET "verifyReport" = COALESCE("verifyReport", '{}'::jsonb) || ${value}::jsonb WHERE id = ${runId}`;
}

export async function finishRun(db: PrismaClient, runId: string, status: PipelineRunStatus, error?: string) {
  await db.pipelineRun.update({ where: { id: runId }, data: { status, finishedAt: new Date(), ...(error ? { error } : {}) } });
}

/** Appends an error line and downgrades SUCCESS to PARTIAL (a change event failed after the source run). */
export async function markRunPartial(db: PrismaClient, runId: string, error: string) {
  const line = `${error}\n`;
  await db.$executeRaw`UPDATE pipeline_run SET error = COALESCE(error, '') || ${line},
    status = CASE WHEN status = 'SUCCESS' THEN 'PARTIAL'::"PipelineRunStatus" ELSE status END WHERE id = ${runId}`;
}
