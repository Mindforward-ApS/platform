"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { getAuth } from "@/server/auth/better-auth";
import { logger } from "@/server/observability/logger";

const inviteInput = z.object({ email: z.email().max(254), role: z.enum(["LEARNER", "ADMIN"]) });

export async function inviteMember(formData: FormData) {
  const ctx = await requireActiveMembership(ADMIN_ROLES);
  const parsed = inviteInput.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) redirect("/virksomhed/medarbejdere?fejl=email");
  try {
    await getAuth().api.createInvitation({
      headers: await headers(),
      body: { email: parsed.data.email.toLowerCase(), role: parsed.data.role, organizationId: ctx.membership.organizationId },
    });
  } catch (err) {
    logger.warn("invitation.create_failed", { err });
    redirect(`/virksomhed/medarbejdere?fejl=${err instanceof APIError && err.status === "BAD_REQUEST" ? "medlem" : "generel"}`);
  }
  redirect("/virksomhed/medarbejdere?ok=invitation");
}

const roleInput = z.object({ memberId: z.string().min(1), role: z.enum(["OWNER", "ADMIN", "LEARNER"]) });

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
