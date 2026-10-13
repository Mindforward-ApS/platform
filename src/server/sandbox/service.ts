import "server-only";
import type { Prisma, PrismaClient, SandboxSession, TrackKey } from "@/generated/prisma/client";
import { defaultTarget, parseSandboxEvent, type SandboxEventInput, type SandboxEventRecord } from "./events";
import { applyEvent, initialState, normalizeState, type SandboxState } from "./reducer";
import { loadSkin } from "./skin";
import { worldVersion } from "./world";

// Sandbox sessions (docs/04 § 2, § 12): one "fri leg" session per user, org and track; events get a server-assigned
// seq inside a transaction; idle sessions close after 7 days. Callers pass userId + organizationId from
// requireUser() — every query is scoped by both (ownership check).

export const SESSION_IDLE_DAYS = 7;
export const MAX_SESSION_EVENTS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SandboxErrorCode = "TRACK_NOT_FOUND" | "SESSION_NOT_FOUND" | "SESSION_CLOSED" | "SESSION_EXPIRED" | "SESSION_FULL" | "INVALID_EVENT";

export class SandboxError extends Error {
  constructor(
    public readonly code: SandboxErrorCode,
    public readonly status: 400 | 404 | 409 | 410 | 422,
  ) {
    super(code);
    this.name = "SandboxError";
  }
}

export interface Owner {
  userId: string;
  organizationId: string;
}

export interface AppendInput {
  event: SandboxEventInput;
  /** Free text (chat message, reply, draft). Stored only in SandboxEvent.contentText (purged after 30 days). */
  contentText?: string;
}

const idleCutoff = (now: Date) => new Date(now.getTime() - SESSION_IDLE_DAYS * DAY_MS);
const expiry = (now: Date) => new Date(now.getTime() + SESSION_IDLE_DAYS * DAY_MS);

export function sessionState(session: Pick<SandboxSession, "state">): SandboxState {
  return normalizeState(session.state);
}

/** Closes ACTIVE sessions without activity for 7 days (cron `sandbox.expire-sessions`, and lazily per user). */
export async function expireIdleSessions(db: PrismaClient, now = new Date(), userId?: string): Promise<number> {
  const { count } = await db.sandboxSession.updateMany({
    where: { status: "ACTIVE", lastActivityAt: { lt: idleCutoff(now) }, ...(userId ? { userId } : {}) },
    data: { status: "CLOSED" },
  });
  return count;
}

/** The free-play session for a track; created (with SESSION_STARTED) when missing, expired, or on a new world/skin. */
export async function getOrCreateFreePlaySession(db: PrismaClient, owner: Owner, trackKey: TrackKey, now = new Date()): Promise<SandboxSession> {
  const track = await db.track.findUnique({ where: { key: trackKey } });
  if (!track || !track.isActive) throw new SandboxError("TRACK_NOT_FOUND", 404);
  loadSkin(track.skinKey); // fails loudly on a Track pointing at a missing/invalid skin file
  const version = worldVersion();

  await expireIdleSessions(db, now, owner.userId);
  const where = { userId: owner.userId, organizationId: owner.organizationId, trackId: track.id, attemptId: null, status: "ACTIVE" as const };
  const reusable = (s: SandboxSession | null) => (s && s.worldVersion === version && s.skinKey === track.skinKey ? s : null);
  const hit = reusable(await db.sandboxSession.findFirst({ where, orderBy: { createdAt: "desc" } }));
  if (hit) return hit;

  return db.$transaction(async (tx) => {
    // Serialize creation per user+org+track so parallel requests (e.g. two renders) cannot create two sessions.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sandbox:${owner.userId}:${owner.organizationId}:${track.id}`}))`;
    const existing = await tx.sandboxSession.findFirst({ where, orderBy: { createdAt: "desc" } });
    if (reusable(existing)) return existing as SandboxSession;
    // A new world version or a changed Track.skinKey starts a fresh session (docs/04 § 12).
    if (existing) await tx.sandboxSession.update({ where: { id: existing.id }, data: { status: "CLOSED" } });
    const started = parseSandboxEvent({ type: "SESSION_STARTED", actor: "SYSTEM", payload: { trackKey, skinKey: track.skinKey, worldVersion: version } });
    const state = applyEvent(initialState(), started);
    const session = await tx.sandboxSession.create({
      data: {
        userId: owner.userId,
        organizationId: owner.organizationId,
        trackId: track.id,
        skinKey: track.skinKey,
        worldVersion: version,
        state: state as unknown as Prisma.InputJsonValue,
        nextSeq: 2,
        lastActivityAt: now,
        expiresAt: expiry(now),
        createdAt: now,
      },
    });
    await tx.sandboxEvent.create({
      data: { sessionId: session.id, userId: owner.userId, organizationId: owner.organizationId, seq: 1, type: started.type, actor: started.actor, payload: started.payload as Prisma.InputJsonValue, createdAt: now },
    });
    return session;
  });
}

/** Ownership + liveness check (requireOwnResource for SandboxSession). */
export async function loadOwnSession(db: PrismaClient, owner: Owner, sessionId: string, now = new Date()): Promise<SandboxSession> {
  const session = await db.sandboxSession.findFirst({ where: { id: sessionId, userId: owner.userId, organizationId: owner.organizationId } });
  if (!session) throw new SandboxError("SESSION_NOT_FOUND", 404);
  if (session.status !== "ACTIVE") throw new SandboxError("SESSION_CLOSED", 409);
  if (session.lastActivityAt < idleCutoff(now)) {
    await db.sandboxSession.update({ where: { id: session.id }, data: { status: "CLOSED" } });
    throw new SandboxError("SESSION_EXPIRED", 410);
  }
  return session;
}

/**
 * Appends events atomically: the row update takes the session lock, reserves `n` seq numbers and returns the
 * latest state; the reducer runs on it; events and the new state are written in the same transaction.
 */
export async function appendEvents(db: PrismaClient, owner: Owner, sessionId: string, inputs: AppendInput[], now = new Date()): Promise<{ events: SandboxEventRecord[]; state: SandboxState }> {
  if (inputs.length === 0) throw new SandboxError("INVALID_EVENT", 400);
  let events: SandboxEventInput[];
  try {
    events = inputs.map((i) => parseSandboxEvent(i.event));
  } catch {
    throw new SandboxError("INVALID_EVENT", 400);
  }

  return db.$transaction(async (tx) => {
    const owned = await tx.sandboxSession.count({ where: { id: sessionId, userId: owner.userId, organizationId: owner.organizationId, status: "ACTIVE" } });
    if (owned === 0) throw new SandboxError("SESSION_NOT_FOUND", 404);
    const locked = await tx.sandboxSession.update({
      where: { id: sessionId },
      data: { nextSeq: { increment: events.length }, lastActivityAt: now, expiresAt: expiry(now) },
      select: { nextSeq: true, state: true },
    });
    const firstSeq = locked.nextSeq - events.length;
    if (locked.nextSeq - 1 > MAX_SESSION_EVENTS) throw new SandboxError("SESSION_FULL", 409);

    let state = normalizeState(locked.state);
    const records: SandboxEventRecord[] = events.map((event, i) => {
      state = applyEvent(state, event);
      const target = event.target ?? defaultTarget(event);
      return { ...event, ...(target ? { target } : {}), seq: firstSeq + i, ts: now.toISOString() } as SandboxEventRecord;
    });
    await tx.sandboxEvent.createMany({
      data: records.map((r, i) => ({
        sessionId,
        userId: owner.userId,
        organizationId: owner.organizationId,
        seq: r.seq,
        type: r.type,
        actor: r.actor,
        target: r.target ?? null,
        stepId: r.stepId ?? null,
        payload: r.payload as Prisma.InputJsonValue,
        contentText: inputs[i]?.contentText ?? null,
        createdAt: now,
      })),
    });
    await tx.sandboxSession.update({ where: { id: sessionId }, data: { state: state as unknown as Prisma.InputJsonValue } });
    return { events: records, state };
  });
}

/** "Nulstil øvemiljø": state back to seed; old events are kept as evidence (docs/04 § 12). */
export async function resetSession(db: PrismaClient, owner: Owner, sessionId: string, reason: "USER" | "MODULE_START" | "STEP_RETRY" = "USER", now = new Date()) {
  return appendEvents(db, owner, sessionId, [{ event: { type: "SESSION_RESET", actor: reason === "USER" ? "USER" : "SYSTEM", payload: { reason } } }], now);
}

export interface ChatTurn {
  seq: number;
  role: "user" | "assistant";
  text: string;
  conversationId: string;
}

/**
 * Chat transcript of the OWN session (the only place that reads SandboxEvent.contentText, after the ownership
 * check). Admin/report queries never select contentText.
 */
export async function loadChatTurns(db: PrismaClient, owner: Owner, sessionId: string, opts: { conversationId?: string; limit?: number } = {}): Promise<ChatTurn[]> {
  const rows = await db.sandboxEvent.findMany({
    where: {
      sessionId,
      userId: owner.userId,
      organizationId: owner.organizationId,
      type: { in: ["CHAT_MESSAGE_SENT", "CHAT_RESPONSE_RECEIVED"] },
      contentText: { not: null },
      ...(opts.conversationId ? { payload: { path: ["conversationId"], equals: opts.conversationId } } : {}),
    },
    orderBy: { seq: "desc" },
    take: opts.limit ?? 100,
    select: { seq: true, type: true, payload: true, contentText: true },
  });
  return rows.reverse().map((r) => ({
    seq: r.seq,
    role: r.type === "CHAT_MESSAGE_SENT" ? "user" : "assistant",
    text: r.contentText ?? "",
    conversationId: String((r.payload as { conversationId?: unknown }).conversationId ?? ""),
  }));
}

/** Seq of the latest SESSION_RESET (assertions count only events after it). */
export async function lastResetSeq(db: PrismaClient, sessionId: string): Promise<number> {
  const row = await db.sandboxEvent.findFirst({ where: { sessionId, type: "SESSION_RESET" }, orderBy: { seq: "desc" }, select: { seq: true } });
  return row?.seq ?? 0;
}
