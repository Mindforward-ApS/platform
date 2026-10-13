import "server-only";
import { z } from "zod";
import type { PrismaClient, SandboxSession } from "@/generated/prisma/client";
import { parseSandboxEvent, SANDBOX_EVENT_TYPES, type SandboxEventInput, type SandboxEventType, type Surface } from "./events";
import { piiGate } from "./pii";
import { appendEvents, resetSession, sessionState, SandboxError, type Owner } from "./service";
import { loadWorld } from "./world";

// User intents for POST /api/sandbox/{sessionId}/actions (docs/04 § 2): Zod → checks against the world/state →
// reducer → event with server-assigned seq. The client can never emit system/model events.

/** Emitted by the server only (session start, chat pipeline, model tool calls). */
const SERVER_ONLY: readonly SandboxEventType[] = ["SESSION_STARTED", "CHAT_MESSAGE_SENT", "CHAT_RESPONSE_RECEIVED", "TOOL_CALL_EXECUTED"];

/** Which intents may carry free text, the surface its PII check runs under, and the length field it fills. */
const TEXT_INTENTS: Partial<Record<SandboxEventType, { surface: Surface; lengthField: string }>> = {
  MAIL_DRAFT_SAVED: { surface: "mail_draft", lengthField: "charCount" },
  ASSISTANT_CREATED: { surface: "assistant_instructions", lengthField: "instructionCharCount" },
  ASSISTANT_UPDATED: { surface: "assistant_instructions", lengthField: "instructionCharCount" },
  AUTOMATION_CREATED: { surface: "automation_prompt", lengthField: "promptCharCount" },
  AUTOMATION_UPDATED: { surface: "automation_prompt", lengthField: "promptCharCount" },
};

export const intentBodySchema = z.strictObject({
  event: z.strictObject({
    type: z.enum(SANDBOX_EVENT_TYPES),
    target: z.string().max(80).optional(),
    stepId: z.string().max(48).optional(),
    payload: z.record(z.string(), z.unknown()),
  }),
  contentText: z.string().min(1).max(8000).optional(),
  piiOverride: z.boolean().optional(),
});
export type IntentBody = z.infer<typeof intentBodySchema>;

export class IntentError extends Error {
  constructor(
    public readonly code: "FORBIDDEN_TYPE" | "UNKNOWN_REFERENCE" | "TEXT_NOT_ALLOWED" | "PII_BLOCKED" | "PII_WARNING",
    public readonly kinds: string[] = [],
  ) {
    super(code);
    this.name = "IntentError";
  }
}

/** Referenced seed/overlay objects must exist in this session's world. */
function checkReferences(event: SandboxEventInput, session: SandboxSession) {
  const world = loadWorld();
  const state = sessionState(session);
  const mails = new Set(world.mail.map((m) => m.id));
  const files = new Set([...world.files.map((f) => f.id), ...state.files.createdFileIds]);
  const customers = new Set(world.crm.map((k) => k.id));
  const events = new Set([...world.calendar.map((c) => c.id), ...state.calendar.createdEventIds]);
  const p = event.payload as Record<string, unknown>;
  const bad =
    (typeof p.mailId === "string" && !mails.has(p.mailId)) ||
    (typeof p.replyToId === "string" && !mails.has(p.replyToId)) ||
    (typeof p.fileId === "string" && !p.fileId.startsWith("file-") && !files.has(p.fileId)) ||
    (typeof p.customerId === "string" && !customers.has(p.customerId)) ||
    (event.type === "CALENDAR_EVENT_OPENED" && !events.has(event.payload.eventId)) ||
    (Array.isArray(p.attachmentFileIds) && p.attachmentFileIds.some((f) => !files.has(String(f)))) ||
    (Array.isArray(p.knowledgeFileIds) && p.knowledgeFileIds.some((f) => !files.has(String(f))));
  if (bad) throw new IntentError("UNKNOWN_REFERENCE");
}

export async function applyIntent(db: PrismaClient, owner: Owner, session: SandboxSession, body: IntentBody) {
  const type = body.event.type;
  if (SERVER_ONLY.includes(type)) throw new IntentError("FORBIDDEN_TYPE");

  if (type === "SESSION_RESET") {
    const reason = body.event.payload.reason;
    if (reason !== undefined && reason !== "USER") throw new IntentError("FORBIDDEN_TYPE");
    return resetSession(db, owner, session.id, "USER");
  }

  const text = TEXT_INTENTS[type];
  if (body.contentText && !text && !(type === "CRM_RECORD_UPDATED" && body.event.payload.field === "notes")) throw new IntentError("TEXT_NOT_ALLOWED");
  const payload = { ...body.event.payload };
  if (body.contentText) {
    const gate = piiGate(body.contentText, body.piiOverride === true);
    const surface: Surface = text?.surface ?? "mail_draft";
    if (gate.outcome === "BLOCK") {
      await appendEvents(db, owner, session.id, [{ event: { type: "PII_BLOCKED", actor: "SYSTEM", payload: { surface, kinds: gate.kinds } } }]);
      throw new IntentError("PII_BLOCKED", gate.kinds);
    }
    if (gate.outcome === "WARN") throw new IntentError("PII_WARNING", gate.kinds);
    // The server is authoritative for lengths derived from free text.
    if (text) payload[text.lengthField] = body.contentText.length;
    else payload.next = body.contentText.length;
  }

  let event: SandboxEventInput;
  try {
    event = parseSandboxEvent({ type, actor: "USER", ...(body.event.target ? { target: body.event.target } : {}), ...(body.event.stepId ? { stepId: body.event.stepId } : {}), payload });
  } catch {
    throw new SandboxError("INVALID_EVENT", 400);
  }
  checkReferences(event, session);
  return appendEvents(db, owner, session.id, [{ event, contentText: body.contentText }]);
}
