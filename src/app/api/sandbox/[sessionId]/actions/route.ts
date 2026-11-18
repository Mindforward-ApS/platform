import { errorResponse, json } from "@/server/sandbox/http";
import { applyIntent, intentBodySchema } from "@/server/sandbox/intents";
import { loadOwnSession } from "@/server/sandbox/service";

// POST /api/sandbox/{sessionId}/actions — a user intent becomes a Zod-validated SandboxEvent (ported from the real platform).
export async function POST(req: Request, ctx: RouteContext<"/api/sandbox/[sessionId]/actions">) {
  try {
    const { sessionId } = await ctx.params;
    const session = loadOwnSession(sessionId);
    const parsed = intentBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "INVALID_EVENT" }, 400);
    const { events, state } = applyIntent(session, parsed.data);
    return json({ seq: events[events.length - 1]?.seq ?? null, state });
  } catch (err) {
    return errorResponse(err);
  }
}
