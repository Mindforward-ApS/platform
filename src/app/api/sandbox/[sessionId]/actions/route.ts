import { requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { errorResponse, json, ownerOf } from "@/server/sandbox/http";
import { applyIntent, intentBodySchema } from "@/server/sandbox/intents";
import { loadOwnSession } from "@/server/sandbox/service";

// POST /api/sandbox/{sessionId}/actions — a user intent becomes a Zod-validated SandboxEvent (docs/04 § 2).
export async function POST(req: Request, ctx: RouteContext<"/api/sandbox/[sessionId]/actions">) {
  try {
    const auth = await requireUser();
    const owner = await ownerOf(auth);
    const { sessionId } = await ctx.params;
    const session = await loadOwnSession(db(), owner, sessionId);
    const parsed = intentBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "INVALID_EVENT" }, 400);
    const { events, state } = await applyIntent(db(), owner, session, parsed.data);
    return json({ seq: events[events.length - 1]?.seq ?? null, state });
  } catch (err) {
    return errorResponse(err);
  }
}
