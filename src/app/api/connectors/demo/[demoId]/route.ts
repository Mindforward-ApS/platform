import { z } from "zod";
import { getMessages } from "@/lib/i18n";
import { gateway, GatewayError } from "@/server/ai/gateway";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { DemoError, prepareDemoRun } from "@/server/connectors/demo";
import { demoTestRunner } from "@/server/connectors/test-runner";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";

// POST /api/connectors/demo/{demoId} — "Prøv den": streams a demo answer on fictional data as Server-Sent Events.
// Gating errors (login, plan, rate limit, prompt, PII, budget) are JSON responses before the stream opens.

const bodySchema = z.strictObject({
  prompt: z.string().max(4000),
  platform: z.enum(["CLAUDE", "CHATGPT", "COPILOT"]),
});

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const json = (body: unknown, status: number, headers: Record<string, string> = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(req: Request, ctx: RouteContext<"/api/connectors/demo/[demoId]">) {
  const t = getMessages().profile.demo.errors;
  try {
    const auth = await requireUser();
    const organizationId = auth.session.activeOrganizationId;
    if (!organizationId) return json({ error: "FORBIDDEN", message: t.FORBIDDEN }, 403);
    const { demoId } = await ctx.params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "INVALID_INPUT", message: t.INVALID_INPUT }, 400);

    const g = await gateway();
    const run = await prepareDemoRun(db(), demoTestRunner((raw) => g.prepareStream(raw)), { userId: auth.user.id, organizationId }, { demoId: demoId.slice(0, 64), ...parsed.data });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)));
        send("start", {});
        try {
          await run.run({ onText: (text) => send("delta", { text }) });
          send("done", {});
        } catch (err) {
          const code = err instanceof GatewayError ? err.code : "PROVIDER";
          if (!(err instanceof GatewayError)) logger.error("connector_demo.failed", { err });
          send("error", { error: code, message: code in t ? t[code as keyof typeof t] : t.generic });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  } catch (err) {
    if (err instanceof AuthzError) return json({ error: err.code, message: err.status === 401 ? t.UNAUTHENTICATED : t.FORBIDDEN }, err.status);
    if (err instanceof DemoError) return json({ error: err.code, message: t[err.code] }, err.status, err.retryAfter ? { "Retry-After": String(err.retryAfter) } : {});
    if (err instanceof GatewayError) {
      const code = err.code;
      return json({ error: code, message: code in t ? t[code as keyof typeof t] : t.generic }, err.status, err.details.retryAfterSec ? { "Retry-After": String(err.details.retryAfterSec) } : {});
    }
    logger.error("connector_demo.unhandled", { err });
    return json({ error: "INTERNAL", message: t.generic }, 500);
  }
}
