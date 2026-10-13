import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Predicate, Step } from "@/lib/schemas/module";

// CLICK_TASK evaluation (docs/05 § 2–3, docs/02 § 4.2). The attempts service only sees the injected
// `EvaluateClickTask`. The sandbox-backed implementation below loads the server-stored SandboxEvent rows and
// delegates the predicate to an injected `evaluatePredicate` — the real one is M3's
// src/server/modules/predicate.ts (wired by the integrator). Nothing here trusts the client.

export type ClickTaskStep = Extract<Step, { type: "CLICK_TASK" }>;

export type ClickTaskEvaluation =
  | { status: "PASSED"; matchedSandboxEventId: string | null }
  | { status: "NOT_YET" }
  /** No sandbox session bound to this attempt (sandbox not built/started yet). */
  | { status: "UNAVAILABLE" };

export type EvaluateClickTask = (attemptId: string, step: ClickTaskStep) => Promise<ClickTaskEvaluation>;

/** The fields predicates may read (docs/05 § 3). Free text (contentText) is never loaded. */
export interface PredicateEvent {
  id: string;
  seq: number;
  type: string;
  target: string | null;
  payload: unknown;
}

/** docs/05 § 3: `evaluatePredicate(pred, events, state) → { pass, matchedSeqs }`. */
export type EvaluatePredicate = (predicate: Predicate, events: readonly PredicateEvent[], state: unknown) => { pass: boolean; matchedSeqs: number[] };

const MAX_EVENTS_PER_SESSION = 5000;

/**
 * Passes only when the predicate holds on events that the server stored for a SandboxSession bound to THIS
 * attempt and tagged with this step (SandboxEvent.stepId), sorted by seq.
 */
export function createSandboxClickTaskEvaluator(db: PrismaClient, evaluatePredicate: EvaluatePredicate): EvaluateClickTask {
  return async (attemptId, step) => {
    const sessions = await db.sandboxSession.findMany({
      where: { attemptId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, state: true },
    });
    if (sessions.length === 0) return { status: "UNAVAILABLE" };
    for (const session of sessions) {
      const events = await db.sandboxEvent.findMany({
        where: { sessionId: session.id, stepId: step.id },
        orderBy: { seq: "asc" },
        take: MAX_EVENTS_PER_SESSION,
        select: { id: true, seq: true, type: true, target: true, payload: true },
      });
      const result = evaluatePredicate(step.assertion, events, session.state);
      if (!result.pass) continue;
      const lastSeq = result.matchedSeqs.length > 0 ? Math.max(...result.matchedSeqs) : null;
      const matched = lastSeq === null ? undefined : events.find((e) => e.seq === lastSeq);
      return { status: "PASSED", matchedSandboxEventId: matched?.id ?? null };
    }
    return { status: "NOT_YET" };
  };
}

/** CLICK_TASK_MOCK=1 (e2e, offline dev): every check passes. Never in production. */
export const mockClickTaskEvaluator: EvaluateClickTask = async () => ({ status: "PASSED", matchedSandboxEventId: null });

/** Default until the sandbox (M3) is wired: the player shows a clear "not available yet" placeholder. */
export const unavailableClickTaskEvaluator: EvaluateClickTask = async () => ({ status: "UNAVAILABLE" });
