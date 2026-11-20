"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/authz";
import { getAuth } from "@/server/auth/better-auth";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { setActiveOrganization } from "@/server/orgs/service";

const invitationId = z.string().min(1).max(100);

export async function acceptInvitation(formData: FormData) {
  const ctx = await requireUser();
  const id = invitationId.parse(formData.get("invitationId"));
  try {
    const res = await getAuth().api.acceptInvitation({ headers: await headers(), body: { invitationId: id } });
    await setActiveOrganization(db(), ctx.session.id, res.invitation.organizationId);
  } catch (err) {
    logger.warn("invitation.accept_failed", { err });
    redirect(`/invitation/${id}?fejl=ugyldig`);
  }
  redirect("/konto");
}

export async function rejectInvitation(formData: FormData) {
  await requireUser();
  const id = invitationId.parse(formData.get("invitationId"));
  try {
    await getAuth().api.rejectInvitation({ headers: await headers(), body: { invitationId: id } });
  } catch (err) {
    logger.warn("invitation.reject_failed", { err });
  }
  redirect("/start");
}
