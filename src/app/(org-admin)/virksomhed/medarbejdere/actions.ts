"use server";

import { APIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { assertBusinessOrg, orgAdminErrorMessage } from "@/server/admin/context";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { getAuth } from "@/server/auth/better-auth";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import {
  createJoinLink,
  disableJoinLink,
  dnsTxtResolver,
  inviteByEmail,
  removeDomain,
  setDomain,
  verifyDomain,
} from "@/server/orgs/invitations";
import { assignTrack, deactivateMember, reactivateMember, setJobRole } from "@/server/orgs/members";
import { writeAudit } from "@/server/audit/log";

// V3 actions. Each authenticates (OWNER/ADMIN of the active BUSINESS org) before touching data; every service
// below is scoped to that org and writes an AuditLog row.

const JOB_ROLES = ["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS", "OTHER"] as const;
const TIERS = ["COPILOT_CHAT", "COPILOT_M365", "UNKNOWN"] as const;
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

async function admin() {
  const ctx = await requireActiveMembership(ADMIN_ROLES);
  await assertBusinessOrg(ctx.membership.organizationId);
  return { ctx, scope: { organizationId: ctx.membership.organizationId, actorUserId: ctx.user.id } };
}

function failed(err: unknown): FormState {
  const message = orgAdminErrorMessage(err);
  if (message) return { error: message };
  if (err instanceof APIError) {
    if (err.message.includes("DPA_REQUIRED")) return { error: getMessages().orgAdmin.invite.dpaRequired };
    if (/plads/i.test(err.message)) return { error: err.message };
  }
  logger.warn("org_admin.action_failed", { err });
  return { error: getMessages().orgAdmin.errors.generic };
}

const inviteInput = z.object({
  emails: z.string().max(20_000),
  role: z.enum(["LEARNER", "ADMIN"]),
  trackId: optional(z.string().max(64)),
  jobRole: optional(z.enum(JOB_ROLES)),
  licenseTier: optional(z.enum(TIERS)),
});

export async function inviteMembers(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { scope } = await admin();
  const parsed = inviteInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: getMessages().orgAdmin.invite.noEmails };
  const h = await headers();
  try {
    const { sent, skipped } = await inviteByEmail(
      db(),
      async (email, role) => {
        const inv = await getAuth().api.createInvitation({ headers: h, body: { email, role, organizationId: scope.organizationId } });
        return { id: inv.id };
      },
      { ...scope, raw: parsed.data.emails, role: parsed.data.role, trackId: parsed.data.trackId ?? null, jobRole: parsed.data.jobRole ?? null, licenseTier: parsed.data.licenseTier ?? null },
    );
    refresh();
    const t = getMessages().orgAdmin.invite;
    return { ok: format(t.sent, { count: sent.length }), ...(skipped.length ? { detail: format(t.skipped, { emails: skipped.join(", ") }) } : {}) };
  } catch (err) {
    return failed(err);
  }
}

export async function cancelInvitation(formData: FormData) {
  const { scope } = await admin();
  const invitationId = z.string().min(1).max(100).parse(formData.get("invitationId"));
  const inv = await db().invitation.findFirst({ where: { id: invitationId, organizationId: scope.organizationId }, select: { id: true } });
  if (inv) {
    try {
      await getAuth().api.cancelInvitation({ headers: await headers(), body: { invitationId } });
    } catch (err) {
      logger.warn("invitation.cancel_failed", { err });
    }
    await writeAudit(db(), { action: "INVITATION_CANCELED", actorUserId: scope.actorUserId, organizationId: scope.organizationId, targetType: "invitation", targetId: invitationId });
  }
  refresh();
}

export async function createOrResetJoinLink(_prev: FormState | null): Promise<FormState> {
  const { scope } = await admin();
  try {
    const token = await createJoinLink(db(), scope);
    refresh();
    return { ok: getMessages().orgAdmin.link.created, detail: `${serverEnv().APP_URL}/deltag/${token}` };
  } catch (err) {
    return failed(err);
  }
}

export async function turnOffJoinLink(_prev: FormState | null): Promise<FormState> {
  const { scope } = await admin();
  await disableJoinLink(db(), scope);
  refresh();
  return { ok: getMessages().orgAdmin.link.disabled };
}

export async function saveDomain(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { scope } = await admin();
  const domain = z.string().max(255).safeParse(formData.get("domain"));
  if (!domain.success) return { error: getMessages().orgAdmin.domain.invalid };
  try {
    await setDomain(db(), { ...scope, domain: domain.data });
    refresh();
    return { ok: getMessages().orgAdmin.domain.save };
  } catch (err) {
    return failed(err);
  }
}

export async function checkDomain(_prev: FormState | null): Promise<FormState> {
  const { scope } = await admin();
  try {
    const { verified } = await verifyDomain(db(), dnsTxtResolver, scope);
    refresh();
    return verified ? { ok: getMessages().orgAdmin.domain.verify } : { error: getMessages().orgAdmin.domain.notFound };
  } catch (err) {
    return failed(err);
  }
}

export async function deleteDomain(_prev: FormState | null): Promise<FormState> {
  const { scope } = await admin();
  await removeDomain(db(), scope);
  refresh();
  return { ok: getMessages().orgAdmin.domain.remove };
}

const assignInput = z.object({
  memberId: z.string().min(1).max(100),
  trackId: optional(z.string().max(64)),
  licenseTier: optional(z.enum(TIERS)),
  jobRole: optional(z.enum(JOB_ROLES)),
});

export async function assignMember(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { scope } = await admin();
  const parsed = assignInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: getMessages().orgAdmin.errors.generic };
  try {
    await assignTrack(db(), scope, parsed.data.memberId, parsed.data.trackId ?? null, parsed.data.licenseTier ?? null);
    await setJobRole(db(), scope, parsed.data.memberId, parsed.data.jobRole ?? null);
    refresh();
    return { ok: getMessages().orgAdmin.members.assign.saved };
  } catch (err) {
    return failed(err);
  }
}

const memberInput = z.object({ memberId: z.string().min(1).max(100) });

export async function removeMember(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { scope } = await admin();
  const { memberId } = memberInput.parse(Object.fromEntries(formData));
  try {
    await deactivateMember(db(), scope, memberId);
    refresh();
    return { ok: getMessages().orgAdmin.members.deactivated };
  } catch (err) {
    return failed(err);
  }
}

export async function restoreMember(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { scope } = await admin();
  const { memberId } = memberInput.parse(Object.fromEntries(formData));
  try {
    await reactivateMember(db(), scope, memberId);
    refresh();
    return { ok: getMessages().orgAdmin.members.reactivated };
  } catch (err) {
    return failed(err);
  }
}

const roleInput = z.object({ memberId: z.string().min(1), role: z.enum(["OWNER", "ADMIN", "LEARNER"]) });

/** Role changes stay with Better Auth (OWNER only; its hook writes MEMBER_ROLE_CHANGED). */
export async function changeMemberRole(formData: FormData) {
  const ctx = await requireActiveMembership(["OWNER"]);
  const parsed = roleInput.parse({ memberId: formData.get("memberId"), role: formData.get("role") });
  try {
    await getAuth().api.updateMemberRole({ headers: await headers(), body: { ...parsed, organizationId: ctx.membership.organizationId } });
  } catch (err) {
    logger.warn("member.role_change_failed", { err });
    redirect("/virksomhed/medarbejdere?fejl=ejer");
  }
  redirect("/virksomhed/medarbejdere");
}

