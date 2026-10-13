"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { requireUser } from "@/server/auth/authz";
import { getFakeStripe } from "@/server/billing/stripe";

/** STRIPE_MOCK only: "pay" on the fake hosted Checkout page; the fake then sends signed webhooks like Stripe. */
export async function payMockCheckout(formData: FormData) {
  if (!serverEnv().STRIPE_MOCK) notFound();
  await requireUser();
  const sessionId = z.string().min(1).parse(formData.get("session"));
  const session = await getFakeStripe().completeCheckout(sessionId);
  redirect(session.success_url ?? "/konto/abonnement");
}
