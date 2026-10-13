import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { gradingRateLimit, scoringConfig } from "@/lib/config/scoring";
import { moduleSchema, type ModuleContent } from "@/lib/schemas/module";
import { logger } from "@/server/observability/logger";
import { gradePromptTask, type GraderDeps } from "@/server/scoring/prompt-task-grader";
import { encodeOwnerFeedback, readOwnerStepTexts } from "@/server/scoring/owner-feedback";
import { evaluateStep, pickBestAttempt, stepPoints } from "@/server/scoring/score";
import { consumeRateLimit } from "@/server/security/rate-limit";
import {
  AttemptError,
  answerSchemas,
  asHintLevel,
  assertCanAnswer,
  computeAttemptScore,
  missingSteps,
  nextHintLevel,
  parseDeterministicAnswer,
  scoreStepRow,
  storedAnswerToScored,
  type GradedStep,
  type StepResultRow,
} from "./attempt-rules";
import type { ClickTaskStep, EvaluateClickTask } from "./click-task";
import type { PlayerState } from "./player-types";
import { sanitizeAttempt, type SanitizeRow } from "./sanitize";

// Attempt lifecycle (docs/05 § 6–7, docs/02 § 4.2). Every function takes the acting user + active organization
// and checks ownership of the attempt itself; server actions call requireUser()/requireActiveMembership() first.

export interface Actor {
  userId: string;
  organizationId: string;
}

export interface AttemptDeps {
  grader: GraderDeps;
  evaluateClickTask: EvaluateClickTask;
}

export interface PlayableOptions {
  /** ALLOW_UNPUBLISHED_MODULES=1 (dev/e2e): IN_REVIEW versions are playable. Otherwise only PUBLISHED. */
  allowUnpublished: boolean;
}

export type SubmitNotice = "PII_REJECTED" | "GRADING_ERROR" | "NOT_IMPROVED" | "CLICK_NOT_YET" | "CLICK_UNAVAILABLE";

// ── Module versions ────────────────────────────────────────────────────────
const contentCache = new Map<string, ModuleContent>();

function parseContent(version: { id: string; contentHash: string; content: unknown }): ModuleContent {
  const key = `${version.id}:${version.contentHash}`;
  let parsed = contentCache.get(key);
  if (!parsed) {
    parsed = moduleSchema.parse(version.content);
    contentCache.set(key, parsed);
  }
  return parsed;
}

const versionSelect = { id: true, version: true, status: true, content: true, contentHash: true, maxPoints: true } as const;

/** The version a new attempt binds to: the published one, or (dev/e2e only) the newest IN_REVIEW/PUBLISHED. */
export async function findPlayableVersion(db: PrismaClient, slug: string, opts: PlayableOptions) {
  const mod = await db.module.findUnique({ where: { slug }, select: { id: true, slug: true, publishedVersion: { select: versionSelect } } });
  if (!mod) return null;
  let version = mod.publishedVersion?.status === "PUBLISHED" ? mod.publishedVersion : null;
  if (!version && opts.allowUnpublished) {
    version = await db.moduleVersion.findFirst({ where: { moduleId: mod.id, status: { in: ["IN_REVIEW", "PUBLISHED"] } }, orderBy: { version: "desc" }, select: versionSelect });
  }
  if (!version) return null;
  return { moduleId: mod.id, slug: mod.slug, version, content: parseContent(version) };
}

// ── Assignment ─────────────────────────────────────────────────────────────
async function ensureAssignment(tx: Prisma.TransactionClient, actor: Actor, moduleId: string) {
  const assignment = await tx.assignment.upsert({
    where: { organizationId_userId_moduleId: { organizationId: actor.organizationId, userId: actor.userId, moduleId } },
    create: { organizationId: actor.organizationId, userId: actor.userId, moduleId, source: "SELF", status: "IN_PROGRESS" },
    update: {},
  });
  if (assignment.status === "ASSIGNED" || assignment.status === "REMOVED") {
    return tx.assignment.update({ where: { id: assignment.id }, data: { status: "IN_PROGRESS" } });
  }
  return assignment;
}

// ── Start / load ───────────────────────────────────────────────────────────
/** Resumes the in-progress attempt for this module or starts a new one bound to the playable version. */
export async function startAttempt(db: PrismaClient, actor: Actor, slug: string, opts: PlayableOptions): Promise<{ attemptId: string; resumed: boolean }> {
  const playable = await findPlayableVersion(db, slug, opts);
  if (!playable) throw new AttemptError("MODULE_UNAVAILABLE");
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`attempt:${actor.userId}:${actor.organizationId}:${playable.moduleId}`}))`;
    const open = await tx.attempt.findFirst({
      where: { userId: actor.userId, organizationId: actor.organizationId, status: "IN_PROGRESS", moduleVersion: { moduleId: playable.moduleId } },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });
    if (open) return { attemptId: open.id, resumed: true };
    const assignment = await ensureAssignment(tx, actor, playable.moduleId);
    const attempt = await tx.attempt.create({
      data: { organizationId: actor.organizationId, userId: actor.userId, assignmentId: assignment.id, moduleVersionId: playable.version.id, maxPoints: playable.version.maxPoints },
      select: { id: true },
    });
    return { attemptId: attempt.id, resumed: false };
  });
}

const rowSelect = {
  stepId: true,
  gradingStatus: true,
  passed: true,
  hintLevelUsed: true,
  tryCount: true,
  answer: true,
  rubricScores: true,
  checksReport: true,
} as const;

async function loadAttempt(db: PrismaClient, actor: Actor, attemptId: string) {
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      assignmentId: true,
      status: true,
      scorePct: true,
      passed: true,
      moduleVersion: { select: { ...versionSelect, module: { select: { id: true, slug: true } } } },
      stepResults: { select: rowSelect },
    },
  });
  // Same error for "missing" and "not yours", so ids cannot be probed.
  if (!attempt || attempt.userId !== actor.userId || attempt.organizationId !== actor.organizationId) throw new AttemptError("NOT_FOUND");
  const content = parseContent(attempt.moduleVersion);
  const rows = new Map<string, SanitizeRow>(attempt.stepResults.map((r) => [r.stepId, r]));
  return { attempt, content, rows };
}

type Loaded = Awaited<ReturnType<typeof loadAttempt>>;

async function loadOpenAttempt(db: PrismaClient, actor: Actor, attemptId: string): Promise<Loaded> {
  const loaded = await loadAttempt(db, actor, attemptId);
  if (loaded.attempt.status !== "IN_PROGRESS") throw new AttemptError("ATTEMPT_CLOSED");
  return loaded;
}

export async function getPlayerState(db: PrismaClient, actor: Actor, attemptId: string): Promise<PlayerState> {
  const { attempt, content, rows } = await loadAttempt(db, actor, attemptId);
  const ownerTexts = await readOwnerStepTexts(db, actor.userId, attemptId);
  return sanitizeAttempt({
    attempt: { id: attempt.id, status: attempt.status, scorePct: attempt.scorePct === null ? null : Number(attempt.scorePct), passed: attempt.passed },
    slug: attempt.moduleVersion.module.slug,
    content,
    maxPoints: attempt.moduleVersion.maxPoints,
    rows,
    ownerTexts,
  });
}

/** For the module page: the newest attempt (in progress first) of this user in this org, if any. */
export async function latestAttemptId(db: PrismaClient, actor: Actor, slug: string): Promise<string | null> {
  const where = { userId: actor.userId, organizationId: actor.organizationId, moduleVersion: { module: { slug } } };
  const open = await db.attempt.findFirst({ where: { ...where, status: "IN_PROGRESS" }, orderBy: { startedAt: "desc" }, select: { id: true } });
  if (open) return open.id;
  const last = await db.attempt.findFirst({ where, orderBy: { startedAt: "desc" }, select: { id: true } });
  return last?.id ?? null;
}

// ── Writing step results ───────────────────────────────────────────────────
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

type FinalData = Omit<Prisma.StepResultUncheckedCreateInput, "attemptId" | "stepId" | "stepType" | "maxPoints">;

/** Writes the one final answer of a step. A concurrent or repeated answer loses with ALREADY_ANSWERED. */
async function writeFinal(db: PrismaClient, attemptId: string, step: GradedStep, data: FinalData): Promise<void> {
  const { count } = await db.stepResult.updateMany({ where: { attemptId, stepId: step.id, gradingStatus: { not: "GRADED" } }, data: data as Prisma.StepResultUncheckedUpdateManyInput });
  if (count > 0) return;
  try {
    await db.stepResult.create({ data: { attemptId, stepId: step.id, stepType: step.type, maxPoints: step.points, ...data } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AttemptError("ALREADY_ANSWERED");
    throw err;
  }
}

function roundedPoints(step: GradedStep, fraction: number, hintLevel: number): number {
  return Math.round(stepPoints(step.points, fraction, asHintLevel(hintLevel)));
}

// ── Answers ────────────────────────────────────────────────────────────────
export async function submitAnswer(db: PrismaClient, deps: AttemptDeps, actor: Actor, attemptId: string, stepId: string, raw: unknown): Promise<{ notice?: SubmitNotice }> {
  const { content, rows } = await loadOpenAttempt(db, actor, attemptId);
  const step = assertCanAnswer(content, rows, stepId);
  const row = rows.get(stepId);
  const hint = row?.hintLevelUsed ?? 0;

  if (step.type === "QUIZ" || step.type === "JUDGMENT" || step.type === "SPOT_ERROR") {
    const answer = parseDeterministicAnswer(step, raw);
    const outcome = evaluateStep(step, answer);
    const { type: _type, ...stored } = answer;
    await writeFinal(db, attemptId, step, {
      gradingStatus: "GRADED",
      answer: stored as Prisma.InputJsonValue,
      passed: outcome.passed,
      points: roundedPoints(step, outcome.fraction, hint),
      tryCount: 1,
    });
    return {};
  }
  if (step.type === "PROMPT_TASK") return submitPrompt(db, deps, actor, attemptId, step, row, raw);
  throw new AttemptError("WRONG_STEP_TYPE");
}

async function submitPrompt(
  db: PrismaClient,
  deps: AttemptDeps,
  actor: Actor,
  attemptId: string,
  step: Extract<GradedStep, { type: "PROMPT_TASK" }>,
  row: SanitizeRow | undefined,
  raw: unknown,
): Promise<{ notice?: SubmitNotice }> {
  const parsed = answerSchemas.PROMPT_TASK.safeParse(raw);
  const maxChars = step.maxChars ?? scoringConfig.promptTask.defaultMaxChars;
  if (!parsed.success || parsed.data.text.trim().length === 0 || parsed.data.text.length > maxChars) throw new AttemptError("INVALID_ANSWER");
  const text = parsed.data.text;

  const limit = await consumeRateLimit(db, `grade-prompt-task:${actor.userId}`, gradingRateLimit);
  if (!limit.allowed) throw new AttemptError("RATE_LIMITED");

  const outcome = await gradePromptTask({ step, submission: text }, deps.grader);
  if (outcome.status === "PII_REJECTED") return { notice: "PII_REJECTED" };

  const hadGraded = row?.gradingStatus === "GRADED";
  if (outcome.status === "ERROR") {
    logger.warn("grading.failed", { attemptId, stepId: step.id, reason: outcome.reason });
    // Never 0 points: the submission does not count and the step stays open (or keeps its best graded result).
    if (!hadGraded) {
      await db.stepResult.upsert({
        where: { attemptId_stepId: { attemptId, stepId: step.id } },
        create: { attemptId, stepId: step.id, stepType: step.type, maxPoints: step.points, gradingStatus: "ERROR", tryCount: 0, passed: false, checksReport: outcome.checks.report as unknown as Prisma.InputJsonValue },
        update: { gradingStatus: "ERROR" },
      });
    }
    return { notice: "GRADING_ERROR" };
  }

  const prevTry = hadGraded ? (row?.tryCount ?? 0) : 0;
  const prevNorm = hadGraded && row ? priorNorm(step, row) : -1;
  const isBest = outcome.norm > prevNorm;
  const common = { tryCount: prevTry + 1, gradingStatus: "GRADED" as const };
  const best: FinalData = isBest
    ? {
        ...common,
        passed: outcome.passed,
        points: roundedPoints(step, outcome.norm, row?.hintLevelUsed ?? 0),
        answer: { status: outcome.status } as Prisma.InputJsonValue,
        checksReport: outcome.checks.report as unknown as Prisma.InputJsonValue,
        rubricScores: (outcome.status === "GRADED" ? Object.entries(outcome.scores).map(([criterionId, score]) => ({ criterionId, score })) : []) as Prisma.InputJsonValue,
        rubricVersion: step.rubric.version,
        modelId: outcome.status === "GRADED" ? outcome.modelId : null,
        promptVersion: outcome.status === "GRADED" ? outcome.promptVersion : null,
        flags: (outcome.status === "GRADED" ? { lowConfidence: outcome.confidence === "LOW", injectionAttempt: outcome.injectionAttempt } : { blocked: true }) as Prisma.InputJsonValue,
        promptText: text,
        aiFeedback:
          outcome.status === "GRADED" ? encodeOwnerFeedback({ overallFeedback: outcome.overallFeedback, criteria: Object.fromEntries(outcome.criteria.map((c) => [c.id, c.feedback])) }) : null,
        promptTextPurgedAt: null,
      }
    : common;

  // Optimistic concurrency: only the request that saw `prevTry` may write the next submission.
  if (row) {
    const { count } = await db.stepResult.updateMany({
      where: { attemptId, stepId: step.id, tryCount: row.tryCount, gradingStatus: row.gradingStatus },
      data: best as Prisma.StepResultUncheckedUpdateManyInput,
    });
    if (count === 0) throw new AttemptError("ALREADY_ANSWERED");
  } else {
    try {
      await db.stepResult.create({ data: { attemptId, stepId: step.id, stepType: step.type, maxPoints: step.points, ...best } });
    } catch (err) {
      if (isUniqueViolation(err)) throw new AttemptError("ALREADY_ANSWERED");
      throw err;
    }
  }
  if (outcome.status === "GRADED" && outcome.confidence === "LOW") logger.info("grading.low_confidence", { attemptId, stepId: step.id, rubricVersion: step.rubric.version });
  return isBest ? {} : { notice: "NOT_IMPROVED" };
}

function priorNorm(step: GradedStep, row: StepResultRow): number {
  const answer = storedAnswerToScored(step, row);
  return answer ? evaluateStep(step, answer).fraction : -1;
}

// ── Hints ──────────────────────────────────────────────────────────────────
export async function takeHint(db: PrismaClient, actor: Actor, attemptId: string, stepId: string, level: number): Promise<{ level: number }> {
  const { content, rows } = await loadOpenAttempt(db, actor, attemptId);
  const newLevel = nextHintLevel(content, rows, stepId, level);
  const step = content.steps.find((s) => s.id === stepId) as GradedStep;
  const current = rows.get(stepId)?.hintLevelUsed ?? 0;
  if (newLevel > current) {
    await db.stepResult.upsert({
      where: { attemptId_stepId: { attemptId, stepId } },
      create: { attemptId, stepId, stepType: step.type, maxPoints: step.points, gradingStatus: "PENDING", tryCount: 0, passed: false, hintLevelUsed: newLevel },
      update: { hintLevelUsed: newLevel },
    });
    // docs/05 § 7: hint 3 (solution) is logged.
    logger.info("module.hint_taken", { attemptId, stepId, hintLevel: newLevel });
  }
  return { level: newLevel };
}

// ── CLICK_TASK ─────────────────────────────────────────────────────────────
export async function checkClickTask(db: PrismaClient, deps: AttemptDeps, actor: Actor, attemptId: string, stepId: string): Promise<{ notice?: SubmitNotice }> {
  const { content, rows } = await loadOpenAttempt(db, actor, attemptId);
  const step = assertCanAnswer(content, rows, stepId);
  if (step.type !== "CLICK_TASK") throw new AttemptError("WRONG_STEP_TYPE");
  const evaluation = await deps.evaluateClickTask(attemptId, step as ClickTaskStep);
  if (evaluation.status === "UNAVAILABLE") return { notice: "CLICK_UNAVAILABLE" };
  if (evaluation.status === "NOT_YET") return { notice: "CLICK_NOT_YET" };
  await writeFinal(db, attemptId, step, {
    gradingStatus: "GRADED",
    answer: { passed: true },
    passed: true,
    points: roundedPoints(step, 1, rows.get(stepId)?.hintLevelUsed ?? 0),
    tryCount: 1,
    matchedSandboxEventId: evaluation.matchedSandboxEventId,
  });
  return {};
}

/** docs/05 § 6: "Spring over" = 0 points. */
export async function skipClickTask(db: PrismaClient, actor: Actor, attemptId: string, stepId: string): Promise<void> {
  const { content, rows } = await loadOpenAttempt(db, actor, attemptId);
  const step = assertCanAnswer(content, rows, stepId);
  if (step.type !== "CLICK_TASK") throw new AttemptError("WRONG_STEP_TYPE");
  await writeFinal(db, attemptId, step, { gradingStatus: "GRADED", answer: { passed: false, skipped: true }, passed: false, points: 0, tryCount: 1 });
}

// ── Finish ─────────────────────────────────────────────────────────────────
export async function finishAttempt(db: PrismaClient, actor: Actor, attemptId: string): Promise<{ scorePct: number; passed: boolean; mustPassFailed: string[] }> {
  const { attempt, content, rows } = await loadOpenAttempt(db, actor, attemptId);
  if (missingSteps(content, rows).length > 0) throw new AttemptError("INCOMPLETE");
  const score = computeAttemptScore(content, rows);
  const scorePct = Math.round(score.scorePct * 100) / 100;
  const now = new Date();

  await db.$transaction(async (tx) => {
    const { count } = await tx.attempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: { status: "COMPLETED", points: Math.round(score.earned), scorePct, passed: score.passed, mustPassFailed: score.mustPassFailed.length > 0, completedAt: now },
    });
    if (count === 0) throw new AttemptError("ATTEMPT_CLOSED");
    // Final per-step points/passed (hints taken after a PROMPT_TASK submission apply too).
    for (const s of content.steps) {
      if (s.type === "READ" || s.type === "DEMO") continue;
      const scored = scoreStepRow(s, rows.get(s.id));
      await tx.stepResult.updateMany({ where: { attemptId, stepId: s.id }, data: { points: Math.round(scored.earned), passed: scored.passed } });
    }
    if (attempt.assignmentId) await refreshAssignment(tx, attempt.assignmentId, now);
  });
  return { scorePct, passed: score.passed, mustPassFailed: score.mustPassFailed };
}

/** Best attempt counts (docs/05 § 6). A passed assignment is never lowered. */
async function refreshAssignment(tx: Prisma.TransactionClient, assignmentId: string, now: Date): Promise<void> {
  const assignment = await tx.assignment.findUnique({ where: { id: assignmentId }, select: { passedAt: true, status: true } });
  if (!assignment) return;
  const attempts = await tx.attempt.findMany({ where: { assignmentId, status: "COMPLETED" }, orderBy: { completedAt: "asc" }, select: { id: true, scorePct: true, passed: true } });
  const best = pickBestAttempt(attempts.map((a) => ({ id: a.id, scorePct: Number(a.scorePct ?? 0), passed: a.passed })));
  if (!best) return;
  const anyPassed = attempts.some((a) => a.passed);
  await tx.assignment.update({
    where: { id: assignmentId },
    data: {
      bestAttemptId: best.id,
      bestScorePct: best.scorePct,
      passedAt: assignment.passedAt ?? (anyPassed ? now : null),
      status: anyPassed || assignment.status === "PASSED" ? "PASSED" : "IN_PROGRESS",
    },
  });
}
