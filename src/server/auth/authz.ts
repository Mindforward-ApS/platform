import "server-only";
import { headers } from "next/headers";
import type { MembershipRole } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { ADMIN_ROLES, AuthzError, assertMembership, assertPlatformAdmin } from "./authz-core";
import { getAuth } from "./better-auth";

// Call one of these FIRST in every server action and route handler (CLAUDE.md "Sikkerhed").
// tests/unit/authz-scan.test.ts fails the build when an action or route skips them.

export { AuthzError } from "./authz-core";

export interface AuthContext {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  session: { id: string; activeOrganizationId: string | null };
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const result = await getAuth().api.getSession({ headers: await headers() });
  if (!result) return null;
  const { user, session } = result;
  return {
    user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
    session: { id: session.id, activeOrganizationId: (session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null },
  };
}

export async function requireUser(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new AuthzError(401, "UNAUTHENTICATED");
  return ctx;
}

export async function requireMembership(organizationId: string, roles: readonly MembershipRole[]) {
  const ctx = await requireUser();
  const membership = await assertMembership(db(), ctx.user.id, organizationId, roles);
  return { ...ctx, membership };
}

export async function requireOrgAdmin(organizationId: string) {
  return requireMembership(organizationId, ADMIN_ROLES);
}

/** Membership in the session's active organization. */
export async function requireActiveMembership(roles: readonly MembershipRole[]) {
  const ctx = await requireUser();
  const orgId = ctx.session.activeOrganizationId;
  if (!orgId) throw new AuthzError(403, "FORBIDDEN");
  const membership = await assertMembership(db(), ctx.user.id, orgId, roles);
  return { ...ctx, membership };
}

export async function requirePlatformAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  await assertPlatformAdmin(db(), ctx.user.id, ctx.session.id);
  return ctx;
}
