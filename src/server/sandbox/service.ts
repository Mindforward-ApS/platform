import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultTarget, parseSandboxEvent, type SandboxEventInput, type SandboxEventRecord } from "./events";
import { applyEvent, initialState, normalizeState, type SandboxState } from "./reducer";
import { loadSkin } from "./skin";
import { worldVersion } from "./world";

// Sandbox sessions, ported from the real platform (mindforward-brain/platform src/server/sandbox/service.ts, 2026-11-03).
// This platform has no database or login yet, so there is one demo learner and every track's session lives in a JSON
// file under .sandbox-data/ (gitignored). Same rules as the original: one free-play session per track, events get a
// seq in order, a new world version or skin starts a fresh session, idle sessions close after 7 days.

export const SESSION_IDLE_DAYS = 7;
export const MAX_SESSION_EVENTS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
// On Vercel the project folder is read-only, so session files go to /tmp there (they reset between cold starts).
const DATA_DIR = process.env.VERCEL ? join(tmpdir(), "sandbox-data") : join(process.cwd(), ".sandbox-data");

export type TrackKey = "CHATGPT" | "COPILOT" | "CLAUDE";
/** Track → skin file in content/sandbox-skins (the original keeps this on the Track row). */
export const SKIN_BY_TRACK: Record<TrackKey, string> = { CHATGPT: "chatgpt", COPILOT: "copilot", CLAUDE: "claude" };

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

export interface SandboxSession {
  id: string;
  trackKey: TrackKey;
  skinKey: string;
  worldVersion: string;
  status: "ACTIVE" | "CLOSED";
  state: SandboxState;
  nextSeq: number;
  createdAt: Date;
  lastActivityAt: Date;
}

type StoredEvent = SandboxEventRecord & { contentText?: string };
interface StoredSession extends Omit<SandboxSession, "createdAt" | "lastActivityAt"> {
  createdAt: string;
  lastActivityAt: string;
  events: StoredEvent[];
}

export interface AppendInput {
  event: SandboxEventInput;
  /** Free text (chat message, reply, draft). */
  contentText?: string;
}

const file = (trackKey: TrackKey) => join(DATA_DIR, `${trackKey.toLowerCase()}.json`);

function read(trackKey: TrackKey): StoredSession | null {
  try {
    return JSON.parse(readFileSync(file(trackKey), "utf8")) as StoredSession;
  } catch {
    return null;
  }
}
function write(s: StoredSession) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(file(s.trackKey), JSON.stringify(s));
}
const toSession = (s: StoredSession): SandboxSession => ({ ...s, state: normalizeState(s.state), createdAt: new Date(s.createdAt), lastActivityAt: new Date(s.lastActivityAt) });
const trackOf = (sessionId: string): TrackKey | null => {
  const key = sessionId.split("-")[1]?.toUpperCase();
  return key && key in SKIN_BY_TRACK ? (key as TrackKey) : null;
};

export function sessionState(session: Pick<SandboxSession, "state">): SandboxState {
  return normalizeState(session.state);
}

/** The free-play session for a track; created (with SESSION_STARTED) when missing, expired, or on a new world/skin. */
export function getOrCreateFreePlaySession(trackKey: TrackKey, now = new Date()): SandboxSession {
  const skinKey = SKIN_BY_TRACK[trackKey];
  if (!skinKey) throw new SandboxError("TRACK_NOT_FOUND", 404);
  loadSkin(skinKey);
  const version = worldVersion();
  const existing = read(trackKey);
  const idle = existing && now.getTime() - new Date(existing.lastActivityAt).getTime() > SESSION_IDLE_DAYS * DAY_MS;
  if (existing && existing.status === "ACTIVE" && !idle && existing.worldVersion === version && existing.skinKey === skinKey) return toSession(existing);

  const started = parseSandboxEvent({ type: "SESSION_STARTED", actor: "SYSTEM", payload: { trackKey, skinKey, worldVersion: version } });
  const state = applyEvent(initialState(), started);
  const stored: StoredSession = {
    id: `sbx-${trackKey.toLowerCase()}-${randomBytes(5).toString("hex")}`,
    trackKey,
    skinKey,
    worldVersion: version,
    status: "ACTIVE",
    state,
    nextSeq: 2,
    createdAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    events: [{ ...started, seq: 1, ts: now.toISOString() } as unknown as StoredEvent],
  };
  write(stored);
  return toSession(stored);
}

/** Liveness check for a session id from the client. */
export function loadOwnSession(sessionId: string, now = new Date()): SandboxSession {
  const trackKey = trackOf(sessionId);
  const s = trackKey ? read(trackKey) : null;
  if (!s || s.id !== sessionId) throw new SandboxError("SESSION_NOT_FOUND", 404);
  if (s.status !== "ACTIVE") throw new SandboxError("SESSION_CLOSED", 409);
  if (now.getTime() - new Date(s.lastActivityAt).getTime() > SESSION_IDLE_DAYS * DAY_MS) {
    write({ ...s, status: "CLOSED" });
    throw new SandboxError("SESSION_EXPIRED", 410);
  }
  return toSession(s);
}

/** Appends events in order: the reducer runs on the latest state; events and the new state are written together. */
export function appendEvents(sessionId: string, inputs: AppendInput[], now = new Date()): { events: SandboxEventRecord[]; state: SandboxState } {
  if (inputs.length === 0) throw new SandboxError("INVALID_EVENT", 400);
  let events: SandboxEventInput[];
  try {
    events = inputs.map((i) => parseSandboxEvent(i.event));
  } catch {
    throw new SandboxError("INVALID_EVENT", 400);
  }
  const trackKey = trackOf(sessionId);
  const s = trackKey ? read(trackKey) : null;
  if (!s || s.id !== sessionId || s.status !== "ACTIVE") throw new SandboxError("SESSION_NOT_FOUND", 404);
  if (s.nextSeq - 1 + events.length > MAX_SESSION_EVENTS) throw new SandboxError("SESSION_FULL", 409);

  let state = normalizeState(s.state);
  const records: StoredEvent[] = events.map((event, i) => {
    state = applyEvent(state, event);
    const target = event.target ?? defaultTarget(event);
    return { ...event, ...(target ? { target } : {}), seq: s.nextSeq + i, ts: now.toISOString(), ...(inputs[i]?.contentText ? { contentText: inputs[i].contentText } : {}) } as unknown as StoredEvent;
  });
  write({ ...s, state, nextSeq: s.nextSeq + events.length, lastActivityAt: now.toISOString(), events: [...s.events, ...records] });
  return { events: records, state };
}

/** "Nulstil øvemiljø": state back to seed; old events are kept. */
export function resetSession(sessionId: string, reason: "USER" | "MODULE_START" | "STEP_RETRY" = "USER", now = new Date()) {
  return appendEvents(sessionId, [{ event: { type: "SESSION_RESET", actor: reason === "USER" ? "USER" : "SYSTEM", payload: { reason } } }], now);
}

export interface ChatTurn {
  seq: number;
  role: "user" | "assistant";
  text: string;
  conversationId: string;
}

/** Chat transcript of the session (newest `limit` turns, oldest first). */
export function loadChatTurns(sessionId: string, opts: { conversationId?: string; limit?: number } = {}): ChatTurn[] {
  const trackKey = trackOf(sessionId);
  const s = trackKey ? read(trackKey) : null;
  if (!s || s.id !== sessionId) return [];
  const turns = s.events
    .filter((e) => (e.type === "CHAT_MESSAGE_SENT" || e.type === "CHAT_RESPONSE_RECEIVED") && e.contentText != null)
    .map((e) => ({ seq: e.seq, role: e.type === "CHAT_MESSAGE_SENT" ? ("user" as const) : ("assistant" as const), text: e.contentText ?? "", conversationId: String((e.payload as { conversationId?: unknown }).conversationId ?? "") }))
    .filter((t) => !opts.conversationId || t.conversationId === opts.conversationId);
  return turns.slice(-(opts.limit ?? 100));
}
