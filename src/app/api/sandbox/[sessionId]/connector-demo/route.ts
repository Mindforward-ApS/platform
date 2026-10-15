import { z } from "zod";
import { getMessages } from "@/lib/i18n";
import { gateway, GatewayError } from "@/server/ai/gateway";
import { requireUser } from "@/server/auth/authz";
import { DemoError, prepareDemoRun } from "@/server/connectors/demo";
import { PLATFORM_BY_TRACK } from "@/server/connectors/service";
import { demoTestRunner } from "@/server/connectors/test-runner";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { errorResponse, json, ownerOf } from "@/server/sandbox/http";
import { loadOwnSession } from "@/server/sandbox/service";

// POST /api/sandbox/{sessionId}/connector-demo — a practice connector ("Prøv") inside the øvemiljø, on example data.
// Same gates as /api/connectors/demo (paid/trial, 10/hour, prompt length, PII, budget); the connector is shown under
// its neutral practice name, never a vendor name (docs/04 § 3).

const bodySchema = z.strictObject({
  demoId: z.string().min(1).max(64),
  prompt: z.string().max(4000),
  kind: z.enum(["office", "files", "chat", "projects", "crm", "shop", "payments", "design", "accounting", "jobs", "automation"]),
});

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export async function POST(req: Request, ctx: RouteContext<"/api/sandbox/[sessionId]/connector-demo">) {
  const t = getMessages().profile.demo.errors;
  try {
    const auth = await requireUser();
    const owner = ownerOf(auth);
    const { sessionId } = await ctx.params;
    const session = await loadOwnSession(db(), owner, sessionId);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "INVALID_INPUT", message: t.INVALID_INPUT }, 400);
    const track = await db().track.findUniqueOrThrow({ where: { id: session.trackId }, select: { key: true } });
    const platform = PLATFORM_BY_TRACK[track.key] ?? "CHATGPT";

    const g = await gateway();
    let run;
    try {
      run = await prepareDemoRun(db(), demoTestRunner((raw) => g.prepareStream(raw)), owner, {
        demoId: parsed.data.demoId,
        prompt: parsed.data.prompt,
        platform,
        connectorLabel: getMessages().sandbox.practice.kinds[parsed.data.kind],
      });
    } catch (err) {
      if (err instanceof DemoError) return json({ error: err.code, message: t[err.code] }, err.status, err.retryAfter ? { "Retry-After": String(err.retryAfter) } : {});
      throw err;
    }

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
          if (!(err instanceof GatewayError)) logger.error("sandbox.connector_demo.failed", { err });
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
