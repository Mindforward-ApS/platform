import "server-only";
import type { Membership, MembershipRole, PrismaClient } from "@/generated/prisma/client";

// Framework-free authorization checks. src/server/auth/authz.ts wraps these with the current request's session.

export type AuthzCode = "UNAUTHENTICATED" | "FORBIDDEN" | "TWO_FACTOR_SETUP_REQUIRED" | "TWO_FACTOR_REQUIRED";

export class AuthzError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly code: AuthzCode,
  ) {
    super(code);
    this.name = "AuthzError";
  }
}

export const ADMIN_ROLES = ["OWNER", "ADMIN"] as const satisfies readonly MembershipRole[];

export async function assertMembership(
  db: PrismaClient,
  userId: string,
  organizationId: string,
  roles: readonly MembershipRole[],
): Promise<Membership> {
  const membership = await db.membership.findFirst({
    where: { userId, organizationId, deactivatedAt: null, organization: { deletedAt: null } },
  });
  if (!membership || !roles.includes(membership.role)) throw new AuthzError(403, "FORBIDDEN");
  return membership;
}

/** GREB_ADMIN with TOTP enrolled and verified on this very session (docs/10-compliance.md § 7). */
export async function assertPlatformAdmin(db: PrismaClient, userId: string, sessionId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { platformRole: true, twoFactorEnabled: true } });
  if (user?.platformRole !== "GREB_ADMIN") throw new AuthzError(403, "FORBIDDEN");
  if (!user.twoFactorEnabled) throw new AuthzError(403, "TWO_FACTOR_SETUP_REQUIRED");
  const session = await db.session.findFirst({
    where: { id: sessionId, userId, expiresAt: { gt: new Date() } },
    select: { twoFactorVerifiedAt: true },
  });
  if (!session?.twoFactorVerifiedAt) throw new AuthzError(403, "TWO_FACTOR_REQUIRED");
}
