import "server-only";
import { AuthzError } from "@/server/auth/authz-core";
import { db } from "@/server/db";
import { OrgAdminError } from "@/server/orgs/errors";
import { format, getMessages } from "@/lib/i18n";
import { DpaError } from "@/server/orgs/dpa";
import { MAX_INVITES_PER_BATCH } from "@/server/orgs/invitations";

// Shared helpers for company-admin pages and actions. Callers authenticate first with
// requireActiveMembership(ADMIN_ROLES); this only adds "the active org is a BUSINESS org".

export async function assertBusinessOrg(organizationId: string): Promise<{ id: string; name: string }> {
  const org = await db().organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, type: true, deletedAt: true } });
  if (!org || org.type !== "BUSINESS" || org.deletedAt) throw new AuthzError(403, "FORBIDDEN");
  return { id: org.id, name: org.name };
}

/** Danish message for a domain error (seat errors carry their own explanation). */
export function orgAdminErrorMessage(err: unknown): string | null {
  const t = getMessages().orgAdmin;
  if (err instanceof DpaError) return err.code === "OWNER_ONLY" ? t.dpa.ownerOnly : t.invite.dpaRequired;
  if (!(err instanceof OrgAdminError)) return null;
  switch (err.code) {
    case "SEAT_LIMIT_REACHED":
      return err.explanation ?? t.seats.addSeats;
    case "DPA_REQUIRED":
      return t.invite.dpaRequired;
    case "PERSONAL_ORG":
      return t.invite.personalOrg;
    case "NO_EMAILS":
      return t.invite.noEmails;
    case "TOO_MANY":
      return format(t.invite.tooMany, { max: MAX_INVITES_PER_BATCH });
    case "LINK_INVALID":
      return t.join.invalid;
    case "ALREADY_MEMBER":
      return getMessages().business.errors.alreadyMember;
    case "DOMAIN_INVALID":
      return t.domain.invalid;
    case "DOMAIN_PUBLIC":
      return t.domain.publicDomain;
    case "DOMAIN_TAKEN":
      return t.domain.taken;
    case "DOMAIN_NOT_VERIFIED":
    case "DOMAIN_TXT_NOT_FOUND":
      return t.domain.notFound;
    case "DOMAIN_MISMATCH":
      return t.join.domainMismatch;
    case "EMAIL_NOT_VERIFIED":
      return t.join.emailNotVerified;
    case "NOT_FOUND":
      return t.errors.notFound;
    case "OWNER_PROTECTED":
      return t.errors.ownerProtected;
    case "LAST_OWNER":
      return t.errors.lastOwner;
  }
}
