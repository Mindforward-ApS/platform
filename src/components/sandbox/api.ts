import type { SandboxState } from "@/server/sandbox/reducer";
import type { Intent } from "./types";

// The sandbox UI talks ONLY to its own API (docs/04 § 1; tests/unit/sandbox-network.test.ts enforces this).

export const actionsUrl = (sessionId: string) => `/api/sandbox/${encodeURIComponent(sessionId)}/actions`;
export const chatUrl = (sessionId: string) => `/api/sandbox/${encodeURIComponent(sessionId)}/chat`;
export const connectorDemoUrl = (sessionId: string) => `/api/sandbox/${encodeURIComponent(sessionId)}/connector-demo`;

export interface ApiError {
  error: string;
  message?: string;
  kinds?: string[];
}

export async function postIntent(sessionId: string, intent: Intent): Promise<{ ok: true; state: SandboxState } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(actionsUrl(sessionId), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intent) });
    const body = (await res.json().catch(() => ({ error: "INTERNAL" }))) as { state?: SandboxState } & ApiError;
    return res.ok && body.state ? { ok: true, state: body.state } : { ok: false, error: body };
  } catch {
    return { ok: false, error: { error: "NETWORK" } };
  }
}

export interface ChatHandlers {
  onStart: (conversationId: string) => void;
  onDelta: (text: string) => void;
  onTool: (info: { tool: string; resultCount: number }) => void;
}

/** Sends a chat message and reads the SSE stream. Returns an ApiError for gating failures (JSON responses). */
export async function streamChat(
  sessionId: string,
  body: { message: string; conversationId?: string; attachmentFileIds: string[]; clientPiiOverride: boolean },
  handlers: ChatHandlers,
): Promise<ApiError | null> {
  let res: Response;
  try {
    res = await fetch(chatUrl(sessionId), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    return { error: "NETWORK" };
  }
  if (!res.ok || !res.body) return ((await res.json().catch(() => null)) as ApiError | null) ?? { error: "INTERNAL" };
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let failure: ApiError | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = /^event: (.+)$/m.exec(frame)?.[1];
      const dataLine = /^data: (.+)$/m.exec(frame)?.[1];
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine) as Record<string, unknown>;
      if (event === "start") handlers.onStart(String(data.conversationId));
      else if (event === "delta") handlers.onDelta(String(data.text ?? ""));
      else if (event === "tool") handlers.onTool({ tool: String(data.tool), resultCount: Number(data.resultCount) });
      else if (event === "error") failure = { error: String(data.error), message: typeof data.message === "string" ? data.message : undefined };
    }
  }
  return failure;
}

export function newOverlayId(prefix: string): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** "Prøv" on a practice connector: streams the example-data demo. Returns an error message, "" for a generic error, or null. */
export async function streamConnectorDemo(sessionId: string, body: { demoId: string; prompt: string; kind: string }, onDelta: (text: string) => void): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(connectorDemoUrl(sessionId), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    return "";
  }
  if (!res.ok || !res.body) return ((await res.json().catch(() => null)) as ApiError | null)?.message ?? "";
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let failure: string | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = /^event: (.+)$/m.exec(frame)?.[1];
      const dataLine = /^data: (.+)$/m.exec(frame)?.[1];
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine) as { text?: string; message?: string };
      if (event === "delta") onDelta(data.text ?? "");
      else if (event === "error") failure = data.message ?? "";
    }
  }
  return failure;
}
