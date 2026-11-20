"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/server/auth/authz";
import { assertMembership } from "@/server/auth/authz-core";
import { billingDeps } from "@/server/billing/deps";
import { requestMeta } from "@/server/billing/request";
import { receiptToken, submitWithdrawal, withdrawalInput } from "@/server/billing/withdrawal";
import { db } from "@/server/db";
import { consumeRateLimit } from "@/server/security/rate-limit";

// Public on purpose (forbrugeraftaleloven § 20 a: the withdrawal function must work without login).
// Logged-in OWNERs of a PERSONAL org get their own subscription matched; everyone else is matched by email.
const PER_IP = { window: 60 * 60, max: 5 };

export async function submitWithdrawalForm(formData: FormData) {
  const parsed = withdrawalInput.safeParse({ name: formData.get("name"), email: formData.get("email"), agreementReference: formData.get("agreement") });
  if (!parsed.success) redirect("/fortryd-aftale?fejl=invalid");
  const meta = await requestMeta();
  const ipKey = createHash("sha256").update(meta.ip ?? "unknown").digest("hex").slice(0, 32);
  const limited = await consumeRateLimit(db(), `withdrawal:ip:${ipKey}`, PER_IP);
  if (!limited.allowed) redirect("/fortryd-aftale?fejl=rate");

  const ctx = await getAuthContext();
  let organizationId: string | null = null;
  if (ctx?.session.activeOrganizationId) {
    try {
      await assertMembership(db(), ctx.user.id, ctx.session.activeOrganizationId, ["OWNER"]);
      organizationId = ctx.session.activeOrganizationId;
    } catch {
      organizationId = null;
    }
  }
  const deps = billingDeps();
  const receipt = await submitWithdrawal(deps, {
    input: parsed.data,
    userId: ctx?.user.id ?? null,
    organizationId,
    channel: ctx ? "ACCOUNT" : "PUBLIC",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  redirect(`/fortryd-aftale/kvittering?id=${receipt.id}&t=${receiptToken(deps.env.BETTER_AUTH_SECRET, receipt.id)}`);
}
