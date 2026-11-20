"use server";

import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { requestCancellation, resumeSubscription } from "@/server/billing/cancel";
import { portalUrl } from "@/server/billing/checkout";
import { billingDeps } from "@/server/billing/deps";

// OWNER or ADMIN may cancel, resume or manage payment (Marco 2026-11-11: "Admin kan også ændre"; was OWNER only,
// docs/00 § 10a). Same actions serve B2C and B2B; a PERSONAL org only has its OWNER.
function back(formData: FormData): string {
  return formData.get("from") === "virksomhed" ? "/virksomhed/abonnement" : "/konto/abonnement";
}

export async function confirmCancellation(formData: FormData) {
  const ctx = await requireActiveMembership(ADMIN_ROLES);
  const result = await requestCancellation(billingDeps(), { organizationId: ctx.membership.organizationId, user: { id: ctx.user.id, email: ctx.user.email } });
  redirect(`${back(formData)}?${result.ok ? "opsagt=1" : "fejl=opsig"}`);
}

export async function resume(formData: FormData) {
  const ctx = await requireActiveMembership(ADMIN_ROLES);
  const result = await resumeSubscription(billingDeps(), { organizationId: ctx.membership.organizationId, userId: ctx.user.id });
  redirect(`${back(formData)}?${result.ok ? "genoptaget=1" : "fejl=genoptag"}`);
}

export async function openPortal(formData: FormData) {
  const ctx = await requireActiveMembership(ADMIN_ROLES);
  const url = await portalUrl(billingDeps(), ctx.membership.organizationId, back(formData));
  redirect(url ?? back(formData));
}
