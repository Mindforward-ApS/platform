"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import type { FormState } from "@/components/admin/action-form";
import { getMessages } from "@/lib/i18n";
import { assertBusinessOrg, orgAdminErrorMessage } from "@/server/admin/context";
import { requireActiveMembership } from "@/server/auth/authz";
import { db } from "@/server/db";
import { acceptDpa, dpaAcceptInput } from "@/server/orgs/dpa";

/** V8: the OWNER accepts the DPA on behalf of the company (docs/10 § 1.2). Evidence → AuditLog DPA_ACCEPTED. */
export async function acceptDataProcessingAgreement(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const ctx = await requireActiveMembership(["OWNER"]);
  await assertBusinessOrg(ctx.membership.organizationId);
  const t = getMessages().orgAdmin.dpa;
  const parsed = dpaAcceptInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.invalid };
  const h = await headers();
  try {
    await acceptDpa(db(), {
      organizationId: ctx.membership.organizationId,
      userId: ctx.user.id,
      input: parsed.data,
      ip: h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for"),
      userAgent: h.get("user-agent"),
    });
  } catch (err) {
    return { error: orgAdminErrorMessage(err) ?? getMessages().orgAdmin.errors.generic };
  }
  refresh();
  return { ok: t.submit };
}
