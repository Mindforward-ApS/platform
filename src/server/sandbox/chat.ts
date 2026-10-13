import "server-only";
import { randomBytes } from "node:crypto";
import type { PrismaClient, SandboxSession } from "@/generated/prisma/client";
import { GatewayError, type ChatMessage, type Gateway } from "@/server/ai/gateway";
import type { SandboxEventInput } from "./events";
import { piiGate } from "./pii";
import { appendEvents, loadChatTurns, sessionState, type AppendInput, type Owner } from "./service";
import { availableTools, executeTool, toolJsonSchema } from "./tools";
import { loadWorld, worldSummary } from "./world";

// Sandbox chat (docs/02 § 4.1): CHAT_MESSAGE_SENT → (TOOL_CALL_EXECUTED)* → CHAT_RESPONSE_RECEIVED.
// Free text (the message and the reply) goes only into SandboxEvent.contentText.

export interface ChatRequest {
  message: string;
  conversationId?: string;
  attachmentFileIds: string[];
  piiOverride: boolean;
  stepId?: string;
}

export interface PreparedChat {
  conversationId: string;
  run(handlers: { onText: (delta: string) => void; onTool?: (info: { tool: string; resultCount: number }) => void }): Promise<{ text: string; seq: number }>;
}

const MAX_ATTACHMENT_CHARS = 8000;
const newId = (prefix: string) => `${prefix}-${randomBytes(6).toString("hex")}`;

export class ChatInputError extends Error {}

export async function prepareChat(db: PrismaClient, gw: Gateway, owner: Owner, session: SandboxSession, req: ChatRequest): Promise<PreparedChat> {
  const world = loadWorld();
  const state = sessionState(session);
  const knownFiles = new Set([...world.files.map((f) => f.id), ...state.files.createdFileIds]);
  if (req.attachmentFileIds.some((id) => !knownFiles.has(id))) throw new ChatInputError("unknown attachment");

  const isNewConversation = !req.conversationId || state.chat.active.id !== req.conversationId;
  const conversationId = isNewConversation ? newId("conv") : (req.conversationId as string);

  const history = isNewConversation ? [] : await loadChatTurns(db, owner, session.id, { conversationId, limit: 24 });
  const attachments = req.attachmentFileIds.map((id) => {
    const f = world.files.find((x) => x.id === id);
    const body = (world.fileBodies[id] ?? (f?.kind === "sheet" ? "Regneark — læs det med sheet_read, hvis Regneark er forbundet." : "")).slice(0, MAX_ATTACHMENT_CHARS);
    return `VEDHÆFTET FIL ${id} (${f?.name ?? id}):\n${body}`;
  });
  const userContent = [req.message, ...attachments].join("\n\n");
  const messages: ChatMessage[] = [...history.map((t) => ({ role: t.role, content: t.text }) as ChatMessage), { role: "user", content: userContent }];

  const tools = availableTools(state);
  const toolEvents: SandboxEventInput[] = [];

  let prepared;
  try {
    prepared = await gw.prepareStream({
      feature: "SANDBOX_CHAT",
      promptKey: "sandbox-chat",
      userId: owner.userId,
      organizationId: owner.organizationId,
      userText: req.message,
      piiOverride: req.piiOverride,
      skinKey: session.skinKey,
      cachedContext: [worldSummary(world)],
      messages,
      tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: toolJsonSchema(t) })),
      runTool: async (name, input) => {
        const current = { world, state, anchor: session.createdAt };
        try {
          const r = executeTool(name, input, current);
          toolEvents.push({
            type: "TOOL_CALL_EXECUTED",
            actor: "MODEL",
            ...(req.stepId ? { stepId: req.stepId } : {}),
            payload: { tool: r.tool.name, connectorId: r.tool.connectorId, filtersUsed: r.filtersUsed.slice(0, 10), resultCount: Math.min(r.resultCount, 100), requiredConfirmation: false, confirmed: null },
          });
          return { content: JSON.stringify(r.result) };
        } catch {
          return { content: "Værktøjet er ikke tilgængeligt eller fik ugyldige argumenter.", isError: true };
        }
      },
    });
  } catch (err) {
    if (err instanceof GatewayError && err.code === "PII_BLOCKED" && err.details.kinds?.length) {
      await appendEvents(db, owner, session.id, [{ event: { type: "PII_BLOCKED", actor: "SYSTEM", payload: { surface: "chat", kinds: err.details.kinds } } }]);
    }
    throw err;
  }

  // The message is stored before the model answers, so it survives a failed reply.
  const before: AppendInput[] = [];
  const step = req.stepId ? { stepId: req.stepId } : {};
  if (isNewConversation) before.push({ event: { type: "CHAT_CONVERSATION_STARTED", actor: "USER", ...step, payload: { conversationId } } });
  const gate = piiGate(req.message, req.piiOverride);
  const overridden = gate.outcome === "ALLOW" && gate.overridden;
  if (overridden) before.push({ event: { type: "PII_WARNING_SHOWN", actor: "USER", ...step, payload: { surface: "chat", kinds: gate.kinds, overridden: true } } });
  before.push({
    event: { type: "CHAT_MESSAGE_SENT", actor: "USER", ...step, payload: { conversationId, charCount: req.message.length, attachmentFileIds: req.attachmentFileIds, piiWarningOverridden: overridden } },
    contentText: req.message,
  });
  await appendEvents(db, owner, session.id, before);

  return {
    conversationId,
    async run({ onText, onTool }) {
      let result: Awaited<ReturnType<typeof prepared.run>>;
      try {
        result = await prepared.run({ onText });
      } catch (err) {
        await appendEvents(db, owner, session.id, [
          ...toolEvents.map((event) => ({ event })),
          { event: { type: "CHAT_RESPONSE_RECEIVED", actor: "MODEL", ...step, payload: { conversationId, charCount: 0, toolCallCount: toolEvents.length, stopReason: "error" } } },
        ]);
        throw err;
      }
      for (const e of toolEvents) if (e.type === "TOOL_CALL_EXECUTED") onTool?.({ tool: e.payload.tool, resultCount: e.payload.resultCount });
      const stopReason = (["end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal", "tool_rounds_exceeded"] as const).find((s) => s === result.stopReason) ?? "end_turn";
      const { events } = await appendEvents(db, owner, session.id, [
        ...toolEvents.map((event) => ({ event })),
        {
          event: { type: "CHAT_RESPONSE_RECEIVED", actor: "MODEL", ...step, payload: { conversationId, charCount: result.text.length, toolCallCount: result.toolCallCount, stopReason } },
          contentText: result.text,
        },
      ]);
      return { text: result.text, seq: events[events.length - 1]?.seq ?? 0 };
    },
  };
}
