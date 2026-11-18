import "server-only";
import { randomBytes } from "node:crypto";
import type { SandboxEventInput } from "./events";
import { piiGate } from "./pii";
import { SANDBOX_SYSTEM_PROMPT, SKIN_ADDENDUM } from "./prompt";
import { appendEvents, loadChatTurns, sessionState, type AppendInput, type SandboxSession } from "./service";
import { availableTools, executeTool, toolJsonSchema, type SandboxTool } from "./tools";
import { loadWorld, worldSummary, type LoadedWorld } from "./world";

// Sandbox chat, ported 2026-11-03 from the real platform (src/server/sandbox/chat.ts):
// CHAT_MESSAGE_SENT → (TOOL_CALL_EXECUTED)* → CHAT_RESPONSE_RECEIVED, same events, same PII gate, same tools.
// The real platform answers through its AI gateway. Here:
// - with ANTHROPIC_API_KEY set: Claude answers with the same system prompt, world summary and tools;
// - without a key: an offline "Øvemodel" answers with example text and, where a connector is connected, real
//   look-ups in the Nordlys world (so connectors and tools can still be practised).

export interface ChatRequest {
  message: string;
  conversationId?: string;
  attachmentFileIds: string[];
  piiOverride: boolean;
}

export class ChatInputError extends Error {}
export class ChatGateError extends Error {
  constructor(
    public readonly code: "PII_BLOCKED" | "PII_WARNING" | "PROVIDER",
    public readonly kinds: string[] = [],
  ) {
    super(code);
  }
}

export interface PreparedChat {
  conversationId: string;
  run(handlers: { onText: (delta: string) => void; onTool?: (info: { tool: string; resultCount: number }) => void }): Promise<{ text: string; seq: number }>;
}

const MAX_ATTACHMENT_CHARS = 8000;
const MAX_TOOL_ROUNDS = 6;
const MODEL = process.env.SANDBOX_MODEL ?? "claude-sonnet-5";
const newId = (prefix: string) => `${prefix}-${randomBytes(6).toString("hex")}`;

type Msg = { role: "user" | "assistant"; content: unknown };

export function prepareChat(session: SandboxSession, req: ChatRequest): PreparedChat {
  const world = loadWorld();
  const state = sessionState(session);
  const knownFiles = new Set([...world.files.map((f) => f.id), ...state.files.createdFileIds]);
  if (req.attachmentFileIds.some((id) => !knownFiles.has(id))) throw new ChatInputError("unknown attachment");

  // Same PII rules as the real gateway: BLOCK is never sent, WARN only after "Det er fiktivt — fortsæt".
  const gate = piiGate(req.message, req.piiOverride);
  if (gate.outcome === "BLOCK") {
    appendEvents(session.id, [{ event: { type: "PII_BLOCKED", actor: "SYSTEM", payload: { surface: "chat", kinds: gate.kinds } } }]);
    throw new ChatGateError("PII_BLOCKED", gate.kinds);
  }
  if (gate.outcome === "WARN") throw new ChatGateError("PII_WARNING", gate.kinds);

  const isNewConversation = !req.conversationId || state.chat.active.id !== req.conversationId;
  const conversationId = isNewConversation ? newId("conv") : (req.conversationId as string);
  const history = isNewConversation ? [] : loadChatTurns(session.id, { conversationId, limit: 24 });
  const attachments = req.attachmentFileIds.map((id) => {
    const f = world.files.find((x) => x.id === id);
    const body = (world.fileBodies[id] ?? (f?.kind === "sheet" ? "Regneark — læs det med sheet_read, hvis Regneark er forbundet." : "")).slice(0, MAX_ATTACHMENT_CHARS);
    return `VEDHÆFTET FIL ${id} (${f?.name ?? id}):\n${body}`;
  });
  const userContent = [req.message, ...attachments].join("\n\n");
  const messages: Msg[] = [...history.map((t) => ({ role: t.role, content: t.text })), { role: "user", content: userContent }];
  const tools = availableTools(state);
  const toolEvents: SandboxEventInput[] = [];
  const runTool = (name: string, input: unknown) => {
    try {
      const r = executeTool(name, input, { world, state, anchor: session.createdAt });
      toolEvents.push({
        type: "TOOL_CALL_EXECUTED",
        actor: "MODEL",
        payload: { tool: r.tool.name, connectorId: r.tool.connectorId, filtersUsed: r.filtersUsed.slice(0, 10), resultCount: Math.min(r.resultCount, 100), requiredConfirmation: false, confirmed: null },
      });
      return { content: JSON.stringify(r.result), result: r.result, count: r.resultCount, ok: true };
    } catch {
      return { content: "Værktøjet er ikke tilgængeligt eller fik ugyldige argumenter.", result: null, count: 0, ok: false };
    }
  };

  // The message is stored before the model answers, so it survives a failed reply.
  const before: AppendInput[] = [];
  if (isNewConversation) before.push({ event: { type: "CHAT_CONVERSATION_STARTED", actor: "USER", payload: { conversationId } } });
  const overridden = gate.outcome === "ALLOW" && gate.overridden;
  if (overridden) before.push({ event: { type: "PII_WARNING_SHOWN", actor: "USER", payload: { surface: "chat", kinds: gate.kinds, overridden: true } } });
  before.push({
    event: { type: "CHAT_MESSAGE_SENT", actor: "USER", payload: { conversationId, charCount: req.message.length, attachmentFileIds: req.attachmentFileIds, piiWarningOverridden: overridden } },
    contentText: req.message,
  });
  appendEvents(session.id, before);

  return {
    conversationId,
    async run({ onText, onTool }) {
      let text = "";
      let stopReason: "end_turn" | "error" | "tool_rounds_exceeded" = "end_turn";
      try {
        text = process.env.ANTHROPIC_API_KEY
          ? await claudeAnswer(session, world, messages, tools, runTool)
          : offlineAnswer(req.message, tools, runTool, req.attachmentFileIds.length).replace(/\*\*/g, ""); // the chat shows plain text
      } catch {
        stopReason = "error";
      }
      if (stopReason === "error") {
        appendEvents(session.id, [
          ...toolEvents.map((event) => ({ event })),
          { event: { type: "CHAT_RESPONSE_RECEIVED", actor: "MODEL", payload: { conversationId, charCount: 0, toolCallCount: toolEvents.length, stopReason: "error" } } },
        ]);
        throw new ChatGateError("PROVIDER");
      }
      for (const e of toolEvents) if (e.type === "TOOL_CALL_EXECUTED") onTool?.({ tool: e.payload.tool, resultCount: e.payload.resultCount });
      // Stream the answer in small pieces, like the real model does.
      for (const piece of text.match(/[\s\S]{1,24}/g) ?? []) {
        onText(piece);
        await new Promise((r) => setTimeout(r, 12));
      }
      const { events } = appendEvents(session.id, [
        ...toolEvents.map((event) => ({ event })),
        { event: { type: "CHAT_RESPONSE_RECEIVED", actor: "MODEL", payload: { conversationId, charCount: text.length, toolCallCount: toolEvents.length, stopReason } }, contentText: text },
      ]);
      return { text, seq: events[events.length - 1]?.seq ?? 0 };
    },
  };
}

type RunTool = (name: string, input: unknown) => { content: string; result: unknown; count: number; ok: boolean };

/** Claude with the real prompt, the world summary and the connected tools (tool loop, non-streaming). */
async function claudeAnswer(session: SandboxSession, world: LoadedWorld, messages: Msg[], tools: SandboxTool[], runTool: RunTool): Promise<string> {
  const system = [
    { type: "text", text: SANDBOX_SYSTEM_PROMPT },
    { type: "text", text: SKIN_ADDENDUM[session.skinKey] ?? "" },
    { type: "text", text: worldSummary(world) },
  ];
  const convo = [...messages];
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY as string, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system, messages: convo, tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: toolJsonSchema(t) })) }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const body = (await res.json()) as { stop_reason: string; content: { type: string; text?: string; id?: string; name?: string; input?: unknown }[] };
    const text = body.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    const uses = body.content.filter((c) => c.type === "tool_use");
    if (body.stop_reason !== "tool_use" || uses.length === 0) return text;
    convo.push({ role: "assistant", content: body.content });
    convo.push({ role: "user", content: uses.map((u) => { const r = runTool(u.name ?? "", u.input); return { type: "tool_result", tool_use_id: u.id, content: r.content, ...(r.ok ? {} : { is_error: true }) }; }) });
  }
  return "Jeg brugte for mange opslag på det spørgsmål. Prøv at spørge lidt mere præcist.";
}

/** Offline Øvemodel: example answers, plus real look-ups in the Nordlys world through the connected tools. */
function offlineAnswer(message: string, tools: SandboxTool[], runTool: RunTool, attachmentCount: number): string {
  const m = message.toLowerCase();
  const has = (name: string) => tools.some((t) => t.name === name);
  const note = "\n\n(Eksempelsvar: den rigtige øvemodel er ikke slået til i denne version endnu.)";
  const words = m.replace(/[^a-zæøå0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
  const query = words.slice(0, 3).join(" ");

  const want = (re: RegExp) => re.test(m);
  if (want(/\b(mail|mails|indbakke|besked|skrev)\b/)) {
    if (!has("mail_search")) return `Jeg kan ikke læse dine mails endnu. Forbind Mail under Forbindelser, så kan jeg søge i indbakken.${note}`;
    // Try the whole query, then each word, then the newest mails (the real model would rephrase the search).
    let hits: { from: string; subject: string; date: string }[] = [];
    for (const q of [query, ...words, ""]) {
      const r = runTool("mail_search", q ? { query: q } : {});
      hits = (Array.isArray(r.result) ? r.result : []) as typeof hits;
      if (hits.length) break;
    }
    const list = hits.length ? hits.slice(0, 5).map((h) => `- **${h.subject}** fra ${h.from} (${h.date})`).join("\n") : "Jeg fandt ingen mails, der passer.";
    return `Her er, hvad jeg fandt i indbakken:\n\n${list}${note}`;
  }
  if (want(/\b(kalender|møde|møder|aftale|aftaler|uge)\b/)) {
    if (!has("calendar_list")) return `Jeg kan ikke se din kalender endnu. Forbind Kalender under Forbindelser.${note}`;
    const r = runTool("calendar_list", { dayFrom: 0, dayTo: 7 });
    const hits = (Array.isArray(r.result) ? r.result : []) as { title: string; date: string; start: string }[];
    const list = hits.length ? hits.slice(0, 6).map((h) => `- ${h.date} kl. ${h.start}: **${h.title}**`).join("\n") : "Der er ingen aftaler den næste uge.";
    return `Din kalender den næste uge:\n\n${list}${note}`;
  }
  if (want(/\b(kunde|kunder|crm|segment|omsætning)\b/)) {
    if (!has("crm_query")) return `Jeg kan ikke se kunderne endnu. Forbind CRM under Forbindelser.${note}`;
    const r = runTool("crm_query", { sort: "annualRevenueDkk", limit: 5 });
    const hits = (Array.isArray(r.result) ? r.result : (r.result as { customers?: unknown[] })?.customers ?? []) as { name: string; city?: string; annualRevenueDkk?: number }[];
    const list = hits.length ? hits.slice(0, 5).map((h) => `- **${h.name}**${h.city ? `, ${h.city}` : ""}${h.annualRevenueDkk ? ` · ${h.annualRevenueDkk.toLocaleString("da-DK")} kr.` : ""}`).join("\n") : "Jeg fandt ingen kunder.";
    return `De største kunder i CRM:\n\n${list}${note}`;
  }
  if (want(/\b(fil|filer|dokument|dokumenter|prisliste|politik|rapport)\b/)) {
    if (!has("files_search")) return `Jeg kan ikke se filerne endnu. Forbind Filer under Forbindelser.${note}`;
    const r = runTool("files_search", { query: query || "nordlys" });
    const hits = (Array.isArray(r.result) ? r.result : []) as { name: string; summary: string }[];
    const list = hits.length ? hits.slice(0, 5).map((h) => `- **${h.name}**: ${h.summary}`).join("\n") : "Jeg fandt ingen filer, der passer.";
    return `Filer, der passer:\n\n${list}${note}`;
  }
  if (want(/\b(budget|regneark|tal)\b/)) {
    if (!has("sheet_read")) return `Jeg kan ikke åbne regnearket endnu. Forbind Regneark under Forbindelser.${note}`;
    runTool("sheet_read", { range: "A1:H6" });
    return `Jeg har læst de første rækker i budgettet. Spørg gerne til en bestemt post, så finder jeg tallet.${note}`;
  }
  if (attachmentCount > 0) return `Jeg har læst den vedhæftede fil. Fortæl mig, hvad du vil have ud af den: et resumé, de vigtigste tal eller et udkast til en mail.${note}`;
  return `Godt spørgsmål. Her er et eksempel på, hvordan jeg ville gribe det an:\n\n1. Jeg skriver et første udkast ud fra det, du har givet mig.\n2. Du fortæller, hvad der skal rettes: tone, længde eller fakta.\n3. Jeg retter det til, indtil det passer.\n\nJo mere du fortæller om modtager, formål og tone, jo bedre bliver svaret.${note}`;
}

const STOP = new Set(["fået", "haft", "noget", "nogle", "hvad", "hvem", "hvor", "hvordan", "hvilke", "hvilken", "find", "finde", "vise", "giver", "kan", "skal", "mine", "mail", "mails", "fra", "til", "med", "som", "der", "det", "den", "denne", "dette", "noget", "lige", "gerne", "venligst", "seneste", "alle"]);
