import { z } from "zod";
import { getMessages } from "@/lib/i18n";
import { errorResponse, json } from "@/server/sandbox/http";
import { loadOwnSession } from "@/server/sandbox/service";

// POST /api/sandbox/{sessionId}/connector-demo — a practice connector ("Prøv") on example data.
// The real platform runs this through its AI gateway; here it streams an example answer until AI is switched on.

const bodySchema = z.strictObject({
  demoId: z.string().min(1).max(64),
  prompt: z.string().max(4000),
  kind: z.enum(["office", "files", "chat", "projects", "crm", "shop", "payments", "design", "accounting", "jobs", "automation"]),
});

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export async function POST(req: Request, ctx: RouteContext<"/api/sandbox/[sessionId]/connector-demo">) {
  try {
    const { sessionId } = await ctx.params;
    loadOwnSession(sessionId);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "INVALID_INPUT", message: getMessages().profile.demo.errors.INVALID_INPUT }, 400);
    const label = getMessages().sandbox.practice.kinds[parsed.data.kind];
    const text = `Eksempelsvar fra ${label} (øvedata): Jeg har kigget i eksempeldataene og fundet tre relevante punkter. 1) Status er opdateret i dag. 2) To sager venter på svar. 3) Ét punkt kræver din godkendelse.\n\nDen rigtige demo kører, når AI er slået til i denne version.`;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(sse("start", {})));
        for (const piece of text.match(/[\s\S]{1,24}/g) ?? []) {
          controller.enqueue(encoder.encode(sse("delta", { text: piece })));
          await new Promise((r) => setTimeout(r, 12));
        }
        controller.enqueue(encoder.encode(sse("done", {})));
        controller.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  } catch (err) {
    return errorResponse(err);
  }
}
