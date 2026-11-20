import { z } from "zod";
import { getMessages } from "@/lib/i18n";
import { gateway, GatewayError } from "@/server/ai/gateway";
import { requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { prepareChat } from "@/server/sandbox/chat";
import { conversationIdSchema, fileIdSchema } from "@/server/sandbox/events";
import { errorResponse, json, ownerOf } from "@/server/sandbox/http";
import { loadOwnSession } from "@/server/sandbox/service";

// POST /api/sandbox/{sessionId}/chat — streams Øvemodel's answer as Server-Sent Events (docs/02 § 4.1).
// Gating errors (rate limit, PII, daily cap, AI off) are plain JSON responses before the stream opens.

const bodySchema = z.strictObject({
  message: z.string().trim().min(1).max(4000),
  conversationId: conversationIdSchema.optional(),
  attachmentFileIds: z.array(fileIdSchema).max(10).default([]),
  clientPiiOverride: z.boolean().default(false),
  stepId: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(48).optional(),
});

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export async function POST(req: Request, ctx: RouteContext<"/api/sandbox/[sessionId]/chat">) {
  try {
    const auth = await requireUser();
    const owner = await ownerOf(auth);
    const { sessionId } = await ctx.params;
    const session = await loadOwnSession(db(), owner, sessionId);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "INVALID_INPUT", message: getMessages().sandbox.errors.INVALID_INPUT }, 400);
    const body = parsed.data;

    const chat = await prepareChat(db(), await gateway(), owner, session, {
      message: body.message,
      conversationId: body.conversationId,
      attachmentFileIds: body.attachmentFileIds,
      piiOverride: body.clientPiiOverride,
      stepId: body.stepId,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)));
        send("start", { conversationId: chat.conversationId, label: getMessages().sandbox.modelLabel });
        try {
          const result = await chat.run({ onText: (text) => send("delta", { text }), onTool: (info) => send("tool", info) });
          send("done", { seq: result.seq, conversationId: chat.conversationId });
        } catch (err) {
          const code = err instanceof GatewayError ? err.code : "PROVIDER";
          if (!(err instanceof GatewayError)) logger.error("sandbox.chat.failed", { err });
          const t = getMessages().sandbox.errors;
          send("error", { error: code, message: code in t ? t[code as keyof typeof t] : t.generic });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  } catch (err) {
    return errorResponse(err);
  }
}
