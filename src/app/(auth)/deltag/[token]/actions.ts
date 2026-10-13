"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { getMessages } from "@/lib/i18n";
import { orgAdminErrorMessage } from "@/server/admin/context";
import { requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { joinByDomain, joinByLink } from "@/server/orgs/invitations";
import { setActiveOrganization } from "@/server/orgs/service";

/** Join via the org's invitation link (seat rule + DPA checked in the service). */
export async function joinWithLink(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const ctx = await requireUser();
  const token = z.string().min(1).max(100).safeParse(formData.get("token"));
  if (!token.success) return { error: getMessages().orgAdmin.join.invalid };
  let organizationId: string;
  try {
    ({ organizationId } = await joinByLink(db(), token.data, ctx.user.id));
  } catch (err) {
    return { error: orgAdminErrorMessage(err) ?? getMessages().orgAdmin.errors.generic };
  }
  await setActiveOrganization(db(), ctx.session.id, organizationId);
  redirect("/konto/data-info");
}

/** Join via verified domain (offered on /konto when the user's verified email matches). */
export async function joinWithDomain(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const ctx = await requireUser();
  const organizationId = z.string().min(1).max(100).safeParse(formData.get("organizationId"));
  if (!organizationId.success) return { error: getMessages().orgAdmin.errors.generic };
  try {
    await joinByDomain(db(), organizationId.data, ctx.user);
  } catch (err) {
    return { error: orgAdminErrorMessage(err) ?? getMessages().orgAdmin.errors.generic };
  }
  await setActiveOrganization(db(), ctx.session.id, organizationId.data);
  redirect("/konto/data-info");
}
