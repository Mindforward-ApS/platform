"use server";

import { z } from "zod";
import { AuthzError, requireActiveMembership } from "@/server/auth/authz";
import { db } from "@/server/db";
import { AttemptError } from "@/server/modules/attempt-rules";
import {
  checkClickTask,
  finishAttempt,
  getPlayerState,
  skipClickTask,
  startAttempt,
  submitAnswer,
  takeHint,
  type Actor,
  type SubmitNotice,
} from "@/server/modules/attempts";
import { playableOptions, playerDeps } from "@/server/modules/deps";
import type { PlayerActionResult } from "@/server/modules/player-types";

// Module player actions (docs/02 § 4.2). Each one authenticates first, then the attempts service checks that
// the attempt belongs to this user in the active organization. Results are always the sanitized player state.

const id = z.string().min(1).max(64);
const slug = z.string().regex(/^[a-z0-9-]{3,64}$/);

async function currentActor() {
  const ctx = await requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]);
  return { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
}

function failure(err: unknown): PlayerActionResult {
  if (err instanceof AttemptError) return { ok: false, error: err.code };
  if (err instanceof AuthzError) return { ok: false, error: err.code };
  if (err instanceof z.ZodError) return { ok: false, error: "INVALID_ANSWER" };
  throw err;
}

async function stateResult(actor: Actor, attemptId: string, notice?: SubmitNotice): Promise<PlayerActionResult> {
  const state = await getPlayerState(db(), actor, attemptId);
  return notice ? { ok: true, state, notice } : { ok: true, state };
}

export async function startAttemptAction(moduleSlug: string): Promise<PlayerActionResult> {
  try {
    const actor = await currentActor();
    const { attemptId } = await startAttempt(db(), actor, slug.parse(moduleSlug), playableOptions());
    return await stateResult(actor, attemptId);
  } catch (err) {
    return failure(err);
  }
}

export async function submitAnswerAction(attemptId: string, stepId: string, answer: unknown): Promise<PlayerActionResult> {
  try {
    const actor = await currentActor();
    const r = await submitAnswer(db(), playerDeps(actor), actor, id.parse(attemptId), id.parse(stepId), answer);
    return await stateResult(actor, attemptId, r.notice);
  } catch (err) {
    return failure(err);
  }
}

export async function takeHintAction(attemptId: string, stepId: string, level: number): Promise<PlayerActionResult> {
  try {
    const actor = await currentActor();
    await takeHint(db(), actor, id.parse(attemptId), id.parse(stepId), z.number().int().min(1).max(3).parse(level));
    return await stateResult(actor, attemptId);
  } catch (err) {
    return failure(err);
  }
}

export async function checkClickTaskAction(attemptId: string, stepId: string): Promise<PlayerActionResult> {
  try {
    const actor = await currentActor();
    const r = await checkClickTask(db(), playerDeps(actor), actor, id.parse(attemptId), id.parse(stepId));
    return await stateResult(actor, attemptId, r.notice);
  } catch (err) {
    return failure(err);
  }
}

export async function skipClickTaskAction(attemptId: string, stepId: string): Promise<PlayerActionResult> {
  try {
    const actor = await currentActor();
    await skipClickTask(db(), actor, id.parse(attemptId), id.parse(stepId));
    return await stateResult(actor, attemptId);
  } catch (err) {
    return failure(err);
  }
}

export async function finishAttemptAction(attemptId: string): Promise<PlayerActionResult> {
  try {
    const actor = await currentActor();
    await finishAttempt(db(), actor, id.parse(attemptId));
    return await stateResult(actor, attemptId);
  } catch (err) {
    return failure(err);
  }
}
