import "server-only";
import { getMessages } from "@/lib/i18n";
import { ChatGateError, ChatInputError } from "./chat";
import { IntentError } from "./intents";
import { SandboxError } from "./service";

// Shared JSON error mapping for the sandbox route handlers (ported 2026-11-03; no login here, so no auth errors).

type ErrorKey = keyof ReturnType<typeof getMessages>["sandbox"]["errors"];

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function errorResponse(err: unknown): Response {
  const t = getMessages().sandbox.errors;
  const msg = (k: ErrorKey) => t[k] ?? t.generic;
  if (err instanceof SandboxError) return json({ error: err.code, message: msg(err.code) }, err.status);
  if (err instanceof ChatGateError) return json({ error: err.code, message: msg(err.code), kinds: err.kinds }, err.code === "PROVIDER" ? 502 : 422);
  if (err instanceof IntentError) {
    if (err.code === "PII_BLOCKED" || err.code === "PII_WARNING") return json({ error: err.code, message: msg(err.code), kinds: err.kinds }, 422);
    return json({ error: err.code, message: t.INVALID_EVENT }, err.code === "FORBIDDEN_TYPE" ? 403 : 400);
  }
  if (err instanceof ChatInputError) return json({ error: "INVALID_INPUT", message: t.INVALID_INPUT }, 400);
  console.error("sandbox.unhandled", err);
  return json({ error: "INTERNAL", message: t.generic }, 500);
}
