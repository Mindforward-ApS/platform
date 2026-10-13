"use server";

import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/server/auth/authz";
import { startB2CCheckout } from "@/server/billing/checkout";
import { billingDeps } from "@/server/billing/deps";
import { requestMeta } from "@/server/billing/request";

export async function buyB2C(formData: FormData) {
  const ctx = await requireActiveMembership(["OWNER"]);
  const result = await startB2CCheckout(billingDeps(), {
    organizationId: ctx.membership.organizationId,
    user: { id: ctx.user.id, email: ctx.user.email },
    consents: { immediateAccess: formData.get("immediateAccess") === "on", withdrawalLossAck: formData.get("withdrawalLossAck") === "on" },
    request: await requestMeta(),
  });
  if (!result.ok) redirect(`/koeb?fejl=${result.error}`);
  redirect(result.url);
}
