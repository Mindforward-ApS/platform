import { z } from "zod";
import { getMessages } from "@/lib/i18n";
import { GatewayError } from "@/server/ai/gateway";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { runSupportTurn, SupportError } from "@/server/support/agent";
import { supportDeps, supportIdentity } from "@/server/support/deps";

// POST /api/support/chat — one support turn, answered as Server-Sent Events (docs/08 § 1).
// requireUser → active membership → rate limit 6/min + 60/day per user (docs/02 § 7; applies to every message,
// also those answered by code without a model) → PII masking + agent loop (src/server/support/agent.ts).
// The reply is guarded BEFORE it is streamed, so unguarded model text never reaches the browser.

const bodySchema = z.strictObject({
  message: z.string().trim().min(1).max(2000),
  conversationId: z.string().min(1).max(64).optional(),
});

const LIMITS = [
  { window: 60, max: 6 },
  { window: 24 * 60 * 60, max: 60 },
];

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(req: Request) {
  const t = getMessages().support.widget.errors;
  try {
    const auth = await requireUser();
    const identity = await supportIdentity(auth.user, auth.session.activeOrganizationId);
    if (!identity) return json({ error: "NO_ORGANIZATION", message: t.NO_ORGANIZATION }, 403);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "INVALID_INPUT", message: t.INVALID_INPUT }, 400);

    for (const [i, rule] of LIMITS.entries()) {
      const r = await consumeRateLimit(db(), `support-chat:${i}:${identity.userId}`, rule);
      if (!r.allowed) return json({ error: "RATE_LIMITED", message: t.RATE_LIMITED }, 429, { "Retry-After": String(r.retryAfter ?? 60) });
    }

    const deps = await supportDeps();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)));
        try {
          const result = await runSupportTurn(deps, identity, parsed.data, { onText: (text) => send("delta", { text }) });
          send("done", { conversationId: result.conversationId, escalationId: result.escalationId });
        } catch (err) {
          const code = err instanceof SupportError ? "FORBIDDEN" : err instanceof GatewayError && err.code === "RATE_LIMITED" ? "RATE_LIMITED" : "generic";
          if (code === "generic") logger.error("support.chat_failed", { err });
          send("error", { error: code, message: t[code] });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  } catch (err) {
    if (err instanceof AuthzError) return json({ error: err.code, message: err.status === 401 ? t.UNAUTHENTICATED : t.FORBIDDEN }, err.status);
    logger.error("support.chat_unhandled", { err });
    return json({ error: "INTERNAL", message: t.generic }, 500);
  }
}
