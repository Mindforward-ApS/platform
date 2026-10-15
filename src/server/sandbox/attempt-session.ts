import "server-only";
import type { Prisma, PrismaClient, SandboxSession } from "@/generated/prisma/client";
import type { Step } from "@/lib/schemas/module";
import { parseContent } from "@/server/modules/attempts";
import { parseSandboxEvent } from "./events";
import { applyEvent, initialState } from "./reducer";
import { appendEvents, expireIdleSessions, SandboxError, SESSION_IDLE_DAYS, type Owner } from "./service";
import { loadSkin } from "./skin";
import { worldVersion } from "./world";

// Attempt-bound sandbox sessions — "opgavevisning" (docs/01 § 4.1.7, docs/04 § 2 and § 12, docs/05 § 2–3).
// One session per Attempt (attemptId set). Events from the embedded sandbox are tagged with the current step id,
// which the server validates against the attempt's module version, so the CLICK_TASK evaluator
// (src/server/modules/click-task.ts) only ever sees events the learner made for that step.

/** Step types that run inside the sandbox. The module schema has no "PROMPT_TASK in the sandbox" flag (yet). */
export const SANDBOX_STEP_TYPES = ["CLICK_TASK"] as const satisfies readonly Step["type"][];
type SandboxStep = Extract<Step, { type: (typeof SANDBOX_STEP_TYPES)[number] }>;

const DAY_MS = 24 * 60 * 60 * 1000;
const isSandboxStep = (step: Step | undefined): step is SandboxStep => Boolean(step && (SANDBOX_STEP_TYPES as readonly string[]).includes(step.type));

async function loadOwnAttempt(db: PrismaClient, owner: Owner, attemptId: string) {
  const attempt = await db.attempt.findFirst({
    where: { id: attemptId, userId: owner.userId, organizationId: owner.organizationId },
    select: {
      id: true,
      status: true,
      moduleVersion: { select: { id: true, contentHash: true, content: true, module: { select: { slug: true, tracks: { select: { track: { select: { id: true, key: true, skinKey: true, isActive: true, sortOrder: true } } } } } } } },
    },
  });
  // Same error for "missing" and "not yours", so ids cannot be probed.
  if (!attempt) throw new SandboxError("ATTEMPT_NOT_FOUND", 404);
  return attempt;
}

type OwnAttempt = Awaited<ReturnType<typeof loadOwnAttempt>>;

function sandboxStepOf(attempt: OwnAttempt, stepId: string): SandboxStep {
  const step = parseContent(attempt.moduleVersion).steps.find((s) => s.id === stepId);
  if (!isSandboxStep(step)) throw new SandboxError("INVALID_STEP", 400);
  return step;
}

/** The learner's own active track when the module runs on it; otherwise the module's first active track. */
async function resolveTrack(db: PrismaClient, owner: Owner, attempt: OwnAttempt) {
  const tracks = attempt.moduleVersion.module.tracks.map((t) => t.track).filter((t) => t.isActive);
  if (tracks.length === 0) throw new SandboxError("TRACK_NOT_FOUND", 404);
  const enrolled = await db.trackEnrollment.findMany({
    where: { userId: owner.userId, organizationId: owner.organizationId, active: true, trackId: { in: tracks.map((t) => t.id) } },
    orderBy: { updatedAt: "desc" },
    select: { trackId: true },
    take: 1,
  });
  const own = tracks.find((t) => t.id === enrolled[0]?.trackId);
  return own ?? [...tracks].sort((a, b) => a.sortOrder - b.sortOrder)[0]!;
}

/**
 * The sandbox session for one step of the learner's own, in-progress attempt. Created with SESSION_STARTED (module
 * slug + the step's scene) when missing; reused otherwise. Entering a step with a different `scene` appends
 * SESSION_RESET{MODULE_START} (docs/04 § 12: "Nyt trin med ny scene"); the same scene keeps the learner's work.
 * Scene files (content/sandbox-world/scenes) do not exist yet, so a scene is recorded but starts from the seed world.
 */
export async function getOrCreateAttemptSession(db: PrismaClient, owner: Owner, attemptId: string, stepId: string, now = new Date()): Promise<SandboxSession> {
  const attempt = await loadOwnAttempt(db, owner, attemptId);
  if (attempt.status !== "IN_PROGRESS") throw new SandboxError("ATTEMPT_CLOSED", 409);
  const step = sandboxStepOf(attempt, stepId);
  const track = await resolveTrack(db, owner, attempt);
  loadSkin(track.skinKey); // fails loudly on a Track pointing at a missing/invalid skin file

  await expireIdleSessions(db, now, owner.userId);
  const where = { attemptId, userId: owner.userId, organizationId: owner.organizationId, status: "ACTIVE" as const };

  let session = await db.sandboxSession.findFirst({ where, orderBy: { createdAt: "desc" } });
  if (!session) {
    session = await db.$transaction(async (tx) => {
      // Serialize creation per attempt so parallel requests (two renders, two tabs) cannot create two sessions.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sandbox-attempt:${owner.userId}:${owner.organizationId}:${attemptId}`}))`;
      const existing = await tx.sandboxSession.findFirst({ where, orderBy: { createdAt: "desc" } });
      if (existing) return existing;
      const started = parseSandboxEvent({
        type: "SESSION_STARTED",
        actor: "SYSTEM",
        stepId: step.id,
        payload: { trackKey: track.key, skinKey: track.skinKey, worldVersion: worldVersion(), moduleSlug: attempt.moduleVersion.module.slug, sceneId: step.scene },
      });
      const created = await tx.sandboxSession.create({
        data: {
          userId: owner.userId,
          organizationId: owner.organizationId,
          trackId: track.id,
          skinKey: track.skinKey,
          worldVersion: worldVersion(),
          moduleVersionId: attempt.moduleVersion.id,
          attemptId,
          sceneId: step.scene,
          state: applyEvent(initialState(), started) as unknown as Prisma.InputJsonValue,
          nextSeq: 2,
          lastActivityAt: now,
          expiresAt: new Date(now.getTime() + SESSION_IDLE_DAYS * DAY_MS),
          createdAt: now,
        },
      });
      await tx.sandboxEvent.create({
        data: { sessionId: created.id, userId: owner.userId, organizationId: owner.organizationId, seq: 1, type: started.type, actor: started.actor, stepId: step.id, payload: started.payload as Prisma.InputJsonValue, createdAt: now },
      });
      return created;
    });
  }

  if (session.sceneId !== step.scene) {
    // Compare-and-set on sceneId: exactly one of two parallel step openings performs the reset.
    const { count } = await db.sandboxSession.updateMany({ where: { id: session.id, sceneId: session.sceneId }, data: { sceneId: step.scene } });
    if (count === 1) await appendEvents(db, owner, session.id, [{ event: { type: "SESSION_RESET", actor: "SYSTEM", stepId: step.id, payload: { reason: "MODULE_START" } } }], now);
    session = await db.sandboxSession.findUniqueOrThrow({ where: { id: session.id } });
  }
  return session;
}

/**
 * Validates a client-sent step id for an event in `session` (never trusted blindly): only attempt-bound sessions take
 * one, and it must be a sandbox step of that attempt's module version. Returns the step id to store, or undefined.
 */
export async function verifySessionStep(db: PrismaClient, owner: Owner, session: Pick<SandboxSession, "attemptId">, stepId: string | undefined): Promise<string | undefined> {
  if (stepId === undefined) return undefined;
  if (!session.attemptId) throw new SandboxError("INVALID_STEP", 400);
  const attempt = await loadOwnAttempt(db, owner, session.attemptId);
  return sandboxStepOf(attempt, stepId).id;
}
