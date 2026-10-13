import "server-only";
import type { EscalationPriority, EscalationReason, Prisma } from "@/generated/prisma/client";
import { format, getMessages } from "@/lib/i18n";
import { GatewayError, type ChatMessage, type Gateway } from "@/server/ai/gateway";
import { subscriptionView } from "@/server/billing/view";
import { logger } from "@/server/observability/logger";
import { captureServerEvent } from "@/server/observability/posthog";
import { createEscalation } from "./escalation";
import { guardOutput, type GuardRule } from "./guard";
import { helpArticleUrl, helpIndex } from "./help";
import { maskSupportPii } from "./pii-mask";
import { isUnresolvedReply, REFUSAL_ESCALATION, refusedIntent, triage, type PolicyIntent } from "./policy";
import { runSupportTool, toolDefinitions, toolResultJson, type SupportContext, type ToolDeps, type ToolOutcome } from "./tools";

// Support agent loop (docs/08 § 1). Order per user message:
//  1 PII mask (before LLM AND storage) · 2 own conversation only · 3 deterministic triage: automatic escalation
//  triggers and forbidden requests (discount / price change / other people's data) are answered by CODE with a
//  refusal + Escalation, without a model call · 4 model with tools via the AI gateway (feature SUPPORT_AGENT:
//  rate limit 6/min + 60/day, daily token cap, global budget, prompt caching) · 5 post-checks: two tool errors →
//  escalate, refund outside an open B2C withdrawal window → escalate, output guard → safe fallback + escalate.
// The reply is buffered until the guard has passed, then streamed to the client — unguarded text never leaves.

export const SUPPORT_PROMPT_KEY = "support-agent";
export const HISTORY_MESSAGES = 20;
const UNRESOLVED_IN_A_ROW = 3;

export class SupportError extends Error {
  constructor(public readonly code: "NOT_FOUND") {
    super(code);
    this.name = "SupportError";
  }
}

export interface AgentDeps extends ToolDeps {
  gateway: Pick<Gateway, "prepareStream">;
  /** Model id recorded on new conversations (from src/server/ai/models.ts). */
  modelId: string;
}

export type AgentIdentity = Omit<SupportContext, "conversationId" | "userMessage">;

export interface TurnResult {
  conversationId: string;
  reply: string;
  escalationId: string | null;
  guardRule: GuardRule | null;
  maskedKinds: string[];
  toolsCalled: { name: string; ok: boolean; input: unknown }[];
  source: "MODEL" | "POLICY" | "FALLBACK";
}

function chunks(text: string): string[] {
  return text.match(/[^]{1,24}/g) ?? [];
}

function excerptOf(text: string, max = 300): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function articleIndexContext(): string {
  const lines = helpIndex()
    .all()
    .map((a) => `- ${a.title} — ${helpArticleUrl(a.slug)}`);
  return `HJÆLPEARTIKLER (titel — link)\n${lines.join("\n")}`;
}

function userLine(id: AgentIdentity): string {
  const first = (id.userName.split(/\s+/)[0] ?? "").replace(/[^\p{L}\p{M}' -]/gu, "").slice(0, 40) || "bruger";
  return `DU TALER MED: ${first} · rolle: ${id.role} · kontotype: ${id.orgType}`;
}

async function loadOrCreateConversation(deps: AgentDeps, id: AgentIdentity, conversationId: string | undefined, now: Date) {
  if (conversationId) {
    // Own conversation only: user AND organization in the where (cross-user/cross-org → not found).
    const conv = await deps.db.supportConversation.findFirst({ where: { id: conversationId, userId: id.userId, organizationId: id.organizationId }, select: { id: true } });
    if (!conv) throw new SupportError("NOT_FOUND");
    return { id: conv.id, created: false };
  }
  const conv = await deps.db.supportConversation.create({
    data: { userId: id.userId, organizationId: id.organizationId, promptVersion: "v1", modelId: deps.modelId, lastMessageAt: now },
    select: { id: true },
  });
  void captureServerEvent({ distinctId: id.userId, event: "support_conversation_started" });
  return { id: conv.id, created: true };
}

async function history(deps: AgentDeps, conversationId: string): Promise<ChatMessage[]> {
  const rows = await deps.db.supportMessage.findMany({
    where: { conversationId, role: { in: ["USER", "ASSISTANT"] } },
    orderBy: { createdAt: "desc" },
    take: HISTORY_MESSAGES,
    select: { role: true, content: true },
  });
  const ordered = rows.reverse();
  const out: ChatMessage[] = [];
  for (const r of ordered) {
    const role = r.role === "USER" ? "user" : "assistant";
    const prev = out[out.length - 1];
    if (prev && prev.role === role && typeof prev.content === "string") prev.content = `${prev.content}\n\n${r.content}`;
    else out.push({ role, content: r.content });
  }
  while (out[0] && out[0].role !== "user") out.shift();
  return out;
}

export async function runSupportTurn(
  deps: AgentDeps,
  identity: AgentIdentity,
  input: { conversationId?: string; message: string },
  handlers: { onText?: (delta: string) => void } = {},
): Promise<TurnResult> {
  const t = getMessages().support.agent;
  const now = deps.now ? deps.now() : new Date();
  const { db } = deps;

  const masked = maskSupportPii(input.message.trim());
  const conv = await loadOrCreateConversation(deps, identity, input.conversationId, now);
  await db.supportMessage.create({ data: { conversationId: conv.id, role: "USER", content: masked.text } });
  const ctx: SupportContext = { ...identity, conversationId: conv.id, userMessage: masked.text };
  const toolsCalled: TurnResult["toolsCalled"] = [];

  const escalate = async (reason: EscalationReason, priority: EscalationPriority, summary: string) =>
    createEscalation(deps, { userId: identity.userId, organizationId: identity.organizationId, userEmail: identity.userEmail, conversationId: conv.id, reason, priority, summary });

  const finish = async (reply: string, extra: Partial<TurnResult> & Pick<TurnResult, "source">): Promise<TurnResult> => {
    const text = masked.maskedKinds.length > 0 ? `${t.piiMasked}\n\n${reply}` : reply;
    await db.supportMessage.create({ data: { conversationId: conv.id, role: "ASSISTANT", content: text } });
    await db.supportConversation.update({ where: { id: conv.id }, data: { lastMessageAt: now } });
    for (const c of chunks(text)) handlers.onText?.(c);
    return { conversationId: conv.id, reply: text, escalationId: null, guardRule: null, maskedKinds: masked.maskedKinds, toolsCalled, ...extra };
  };

  // ── 3. deterministic triage ───────────────────────────────────────────────
  const tri = triage(masked.text, identity.userEmail);
  if (tri.auto) {
    const summary = `${t.summaries.humanRequested} (${tri.auto.trigger}) Besked: "${excerptOf(masked.text)}"`;
    const r = await escalate(tri.auto.reason, tri.auto.priority, summary);
    return finish(format(t.escalated, { id: r.escalationId, expected: r.expectedResponse }), { source: "POLICY", escalationId: r.escalationId });
  }
  const refused = refusedIntent(tri.intents);
  if (refused) {
    const rule = REFUSAL_ESCALATION[refused];
    const summary = `${format(t.summaries.policy, { intent: t.intents[refused] })} Besked: "${excerptOf(masked.text)}"`;
    const r = await escalate(rule.reason, rule.priority, summary);
    return finish(format(t.refusals[refused], { id: r.escalationId, expected: r.expectedResponse }), { source: "POLICY", escalationId: r.escalationId });
  }
  if (isUnresolvedReply(masked.text)) {
    const lastUsers = await db.supportMessage.findMany({ where: { conversationId: conv.id, role: "USER" }, orderBy: { createdAt: "desc" }, take: UNRESOLVED_IN_A_ROW, select: { content: true } });
    if (lastUsers.length === UNRESOLVED_IN_A_ROW && lastUsers.every((m) => isUnresolvedReply(m.content))) {
      const r = await escalate("OTHER", "NORMAL", t.summaries.unresolved);
      return finish(format(t.escalated, { id: r.escalationId, expected: r.expectedResponse }), { source: "POLICY", escalationId: r.escalationId });
    }
  }

  // ── 4. model with tools ───────────────────────────────────────────────────
  const outcomes: ToolOutcome[] = [];
  let modelText: string;
  try {
    const stream = await deps.gateway.prepareStream({
      feature: "SUPPORT_AGENT",
      promptKey: SUPPORT_PROMPT_KEY,
      userId: identity.userId,
      organizationId: identity.organizationId,
      userText: masked.text,
      // BLOCK kinds are already masked; WARN kinds (the user's own e-mail/phone) are normal in support.
      piiOverride: true,
      cachedContext: [articleIndexContext()],
      dynamicContext: userLine(identity),
      dynamicContextLabel: "BRUGER",
      messages: await history(deps, conv.id),
      tools: toolDefinitions(),
      runTool: async (name, raw) => {
        const out = await runSupportTool(deps, ctx, name, raw);
        outcomes.push(out);
        toolsCalled.push({ name: out.name, ok: out.ok, input: out.input });
        await db.supportMessage.create({
          data: { conversationId: conv.id, role: "TOOL", content: "", toolName: out.name.slice(0, 64), toolInput: toolResultJson(out.input), toolResult: toolResultJson(out.output) },
        });
        return { content: JSON.stringify(out.output), isError: !out.ok };
      },
    });
    modelText = (await stream.run({})).text.trim();
  } catch (err) {
    if (err instanceof GatewayError && err.code === "RATE_LIMITED") throw err;
    if (err instanceof GatewayError && err.code === "AI_DISABLED") return finish(degradedReply(masked.text), { source: "FALLBACK" });
    if (err instanceof GatewayError && err.code === "USER_CAP") return finish(t.userCap, { source: "FALLBACK" });
    logger.error("support.agent_failed", { code: err instanceof GatewayError ? err.code : "UNKNOWN", err: err instanceof GatewayError ? undefined : err });
    return finish(t.providerError, { source: "FALLBACK" });
  }

  // ── 5. post-checks ────────────────────────────────────────────────────────
  const modelEscalation = outcomes.find((o) => o.name === "escalate_to_human" && o.ok)?.output as { escalationId?: string } | undefined;
  let escalationId = modelEscalation?.escalationId ?? null;

  const failures = outcomes.filter((o) => !o.ok && (o.output as { error?: string }).error === "FAILED").length;
  if (failures >= 2 && !escalationId) {
    const r = await escalate("BUG", "NORMAL", t.summaries.toolErrors);
    return finish(format(t.escalated, { id: r.escalationId, expected: r.expectedResponse }), { source: "FALLBACK", escalationId: r.escalationId });
  }

  const allowedEmails = [identity.userEmail, deps.env.SUPPORT_INBOX ?? "", ...outcomes.flatMap((o) => emailsIn(o.output))];
  const guard = guardOutput(modelText, { allowedEmails });
  if (!guard.ok) {
    await db.supportMessage.create({ data: { conversationId: conv.id, role: "TOOL", content: "", toolName: "guard", toolResult: { rule: guard.rule } as Prisma.InputJsonValue } });
    const { reason, priority } = guardEscalation(guard.rule, tri.intents);
    const r = await escalate(reason, priority, format(t.summaries.guardHit, { rule: guard.rule }));
    logger.warn("support.guard_hit", { rule: guard.rule, conversationId: conv.id });
    return finish(format(t.guardFallback, { id: r.escalationId, expected: r.expectedResponse }), { source: "FALLBACK", escalationId: r.escalationId, guardRule: guard.rule });
  }

  let reply = modelText || t.providerError;
  if (tri.intents.includes("REFUND") && !escalationId) {
    // B2C inside the 14-day window → the "Fortryd aftale" button; everything else goes to a human (docs/08 § 3.2).
    const windowOpen = identity.orgType === "PERSONAL" && (await subscriptionView(db, identity.organizationId, now)).withdrawalOpen;
    if (!windowOpen) {
      const r = await escalate("REFUND_OR_BILLING_DISPUTE", "NORMAL", `${format(t.summaries.policy, { intent: t.intents.REFUND })} Besked: "${excerptOf(masked.text)}"`);
      escalationId = r.escalationId;
      reply = `${reply}\n\n${format(t.escalated, { id: r.escalationId, expected: r.expectedResponse })}`;
    }
  }
  return finish(reply, { source: "MODEL", escalationId });
}

function emailsIn(value: unknown): string[] {
  return JSON.stringify(value ?? "").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g) ?? [];
}

function guardEscalation(rule: GuardRule, intents: PolicyIntent[]): { reason: EscalationReason; priority: EscalationPriority } {
  switch (rule) {
    case "PROMISE":
      return intents.includes("REFUND") ? { reason: "REFUND_OR_BILLING_DISPUTE", priority: "NORMAL" } : { reason: "PRICING_OR_DISCOUNT", priority: "NORMAL" };
    case "LEGAL":
      return { reason: "LEGAL_OR_PRIVACY", priority: "NORMAL" };
    case "FOREIGN_EMAIL":
      return { reason: "LEGAL_OR_PRIVACY", priority: "HIGH" };
    case "LEAK":
    case "AFFILIATION":
      return { reason: "OTHER", priority: "NORMAL" };
  }
}

/** Global budget used up / AI off: help-center search + escalation offer, no model (docs/02 § 6, § 8). */
export function degradedReply(question: string): string {
  const t = getMessages().support.agent;
  const hits = helpIndex().search(question, 3);
  if (hits.length === 0) return `${t.degradedNoHits} ${t.degradedEscalate}`;
  return [t.degradedIntro, ...hits.map((h) => `- ${h.title}: ${helpArticleUrl(h.slug)}`), t.degradedEscalate].join("\n");
}
