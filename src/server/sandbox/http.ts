import "server-only";
import { getMessages } from "@/lib/i18n";
import { AuthzError, type AuthContext } from "@/server/auth/authz";
import { assertMembership } from "@/server/auth/authz-core";
import { db } from "@/server/db";
import { GatewayError } from "@/server/ai/gateway";
import { logger } from "@/server/observability/logger";
import { ChatInputError } from "./chat";
import { IntentError } from "./intents";
import { SandboxError, type Owner } from "./service";

// Shared JSON error mapping for the sandbox route handlers. Messages are friendly Danish (docs/04 § 11).

type ErrorKey = keyof ReturnType<typeof getMessages>["sandbox"]["errors"];

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** The sandbox runs in the session's active organization; no active org → 403. */
/** The sandbox runs in the session's active organization — only while the caller is an ACTIVE member of it
 *  (a deactivated member must not keep using the company's sandbox, AI budget or entitlements). */
export async function ownerOf(ctx: AuthContext): Promise<Owner> {
  const organizationId = ctx.session.activeOrganizationId;
  if (!organizationId) throw new AuthzError(403, "FORBIDDEN");
  await assertMembership(db(), ctx.user.id, organizationId, ["OWNER", "ADMIN", "LEARNER"]);
  return { userId: ctx.user.id, organizationId };
}

export function errorResponse(err: unknown): Response {
  const t = getMessages().sandbox.errors;
  const msg = (k: ErrorKey) => t[k] ?? t.generic;
  if (err instanceof AuthzError) return json({ error: err.code, message: msg(err.code === "UNAUTHENTICATED" ? "UNAUTHENTICATED" : "FORBIDDEN") }, err.status);
  if (err instanceof SandboxError) return json({ error: err.code, message: msg(err.code) }, err.status);
  if (err instanceof GatewayError) {
    const headers: Record<string, string> = err.details.retryAfterSec ? { "Retry-After": String(err.details.retryAfterSec) } : {};
    return json({ error: err.code, message: msg(err.code), kinds: err.details.kinds ?? [] }, err.status, headers);
  }
  if (err instanceof IntentError) {
    if (err.code === "PII_BLOCKED" || err.code === "PII_WARNING") return json({ error: err.code, message: msg(err.code), kinds: err.kinds }, 422);
    return json({ error: err.code, message: t.INVALID_EVENT }, err.code === "FORBIDDEN_TYPE" ? 403 : 400);
  }
  if (err instanceof ChatInputError) return json({ error: "INVALID_INPUT", message: t.INVALID_INPUT }, 400);
  logger.error("sandbox.unhandled", { err });
  return json({ error: "INTERNAL", message: t.generic }, 500);
}
