"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMembership } from "@/server/auth/authz";
import { startB2BCheckout, startB2BTrial } from "@/server/billing/checkout";
import { billingDeps } from "@/server/billing/deps";
import { changeSeats } from "@/server/billing/seats";

// B2B billing: OWNER only (docs/00 § 10a). ADMIN sees status on the page but cannot call these.
const PAGE = "/virksomhed/abonnement";

export async function startTrial(formData: FormData) {
  const ctx = await requireActiveMembership(["OWNER"]);
  const result = await startB2BTrial(billingDeps(), {
    organizationId: ctx.membership.organizationId,
    user: { id: ctx.user.id, email: ctx.user.email },
    cvr: String(formData.get("cvr") ?? ""),
  });
  redirect(result.ok ? `${PAGE}?proeve=1` : `${PAGE}?fejl=${result.error}`);
}

const buyInput = z.object({ planKey: z.enum(["B2B_MONTHLY", "B2B_ANNUAL"]), seats: z.coerce.number().int() });

export async function buyB2B(formData: FormData) {
  const ctx = await requireActiveMembership(["OWNER"]);
  const parsed = buyInput.safeParse({ planKey: formData.get("planKey"), seats: formData.get("seats") });
  if (!parsed.success) redirect(`${PAGE}?fejl=MIN_SEATS`);
  const result = await startB2BCheckout(billingDeps(), { organizationId: ctx.membership.organizationId, user: { id: ctx.user.id, email: ctx.user.email }, ...parsed.data });
  if (!result.ok) redirect(`${PAGE}?fejl=${result.error}`);
  redirect(result.url);
}

export async function updateSeats(formData: FormData) {
  const ctx = await requireActiveMembership(["OWNER"]);
  const seats = z.coerce.number().int().safeParse(formData.get("seats"));
  if (!seats.success) redirect(`${PAGE}?fejl=MIN_SEATS`);
  const result = await changeSeats(billingDeps(), { organizationId: ctx.membership.organizationId, userId: ctx.user.id, seats: seats.data });
  redirect(result.ok ? `${PAGE}?pladser=1` : `${PAGE}?fejl=${result.error}`);
}
