"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { writeAudit } from "@/server/audit/log";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { db } from "@/server/db";

const policyInput = z.preprocess((v) => (v === "" ? null : v), z.url().max(500).refine((u) => /^https:\/\//.test(u)).nullable());

/** Link to the company's own AI policy (onboarding step ⑤, printed in the report). */
export async function saveAiPolicyUrl(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const ctx = await requireActiveMembership(ADMIN_ROLES);
  await assertBusinessOrg(ctx.membership.organizationId);
  const t = getMessages().orgAdmin.report;
  const parsed = policyInput.safeParse(formData.get("aiPolicyUrl"));
  if (!parsed.success) return { error: t.policyInvalid };
  await db().organization.update({ where: { id: ctx.membership.organizationId }, data: { aiPolicyUrl: parsed.data } });
  await writeAudit(db(), { action: "AI_POLICY_URL_CHANGED", actorUserId: ctx.user.id, organizationId: ctx.membership.organizationId, targetType: "organization", targetId: ctx.membership.organizationId });
  refresh();
  return { ok: t.policySaved };
}
