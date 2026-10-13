import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { format, getMessages } from "@/lib/i18n";
import { writeAudit } from "@/server/audit/log";
import { nowOf, type BillingDeps } from "./deps";
import { currentSubscription, getEntitlements } from "./entitlements";
import { billingRules } from "./plans";
import { stripeSubscriptionSchema } from "./sync";

// Seats (docs/00-beslutninger.md § 10a): seat = active Membership (all roles) + open Invitation.
// The invitation cap is enforced in Better Auth's beforeCreateInvitation hook (src/server/auth/better-auth.ts).

export async function seatUsage(db: PrismaClient, organizationId: string, now: Date = new Date(), opts: { excludeInvitationEmail?: string } = {}): Promise<number> {
  const [members, invitations] = await Promise.all([
    db.membership.count({ where: { organizationId, deactivatedAt: null } }),
    db.invitation.count({
      where: {
        organizationId,
        status: "pending",
        expiresAt: { gt: now },
        // Re-inviting the same address replaces the old invitation (cancelPendingInvitationsOnReInvite).
        ...(opts.excludeInvitationEmail ? { NOT: { email: opts.excludeInvitationEmail.toLowerCase() } } : {}),
      },
    }),
  ]);
  return members + invitations;
}

export type SeatDecision = { allowed: true } | { allowed: false; reason: "SEAT_LIMIT_REACHED" | "READ_ONLY"; limit: number; used: number };

export function decideSeat(args: { used: number; limit: number; readOnly: boolean }): SeatDecision {
  if (args.readOnly) return { allowed: false, reason: "READ_ONLY", limit: args.limit, used: args.used };
  if (args.used + 1 > args.limit) return { allowed: false, reason: "SEAT_LIMIT_REACHED", limit: args.limit, used: args.used };
  return { allowed: true };
}

export class SeatLimitError extends Error {
  constructor(
    public readonly reason: "SEAT_LIMIT_REACHED" | "READ_ONLY",
    message: string,
  ) {
    super(message);
    this.name = "SeatLimitError";
  }
}

/** Throws SeatLimitError (Danish, user-facing message) when one more seat would exceed the plan. */
export async function assertSeatAvailable(db: PrismaClient, organizationId: string, opts: { now?: Date; inviteEmail?: string } = {}): Promise<void> {
  const now = opts.now ?? new Date();
  const ent = await getEntitlements(db, organizationId, now);
  const used = await seatUsage(db, organizationId, now, { excludeInvitationEmail: opts.inviteEmail });
  const decision = decideSeat({ used, limit: ent.seatLimit, readOnly: ent.readOnly });
  if (decision.allowed) return;
  const t = getMessages().billing.seats;
  throw new SeatLimitError(decision.reason, decision.reason === "READ_ONLY" ? t.readOnly : format(t.limitReached, { limit: decision.limit }));
}

export type SeatChangeError = "NO_ACTIVE_SUBSCRIPTION" | "MIN_SEATS" | "BELOW_USED" | "UNCHANGED";

/**
 * OWNER changes seats on an active B2B subscription (docs/07 § 4.3). Up: prorated invoice now.
 * Down: no credit for the running period (proration "none"); never below 5 or below seats in use.
 */
export async function changeSeats(
  deps: BillingDeps,
  args: { organizationId: string; userId: string; seats: number },
): Promise<{ ok: true } | { ok: false; error: SeatChangeError }> {
  const sub = await currentSubscription(deps.db, args.organizationId);
  if (!sub || sub.status !== "ACTIVE") return { ok: false, error: "NO_ACTIVE_SUBSCRIPTION" };
  if (!Number.isInteger(args.seats) || args.seats < billingRules.b2bMinSeats || args.seats > 500) return { ok: false, error: "MIN_SEATS" };
  if (args.seats < (await seatUsage(deps.db, args.organizationId, nowOf(deps)))) return { ok: false, error: "BELOW_USED" };
  if (args.seats === sub.quantity) return { ok: false, error: "UNCHANGED" };
  const remote = stripeSubscriptionSchema.parse(await deps.stripe.subscriptions.retrieve(sub.stripeSubscriptionId));
  const item = remote.items.data[0]!;
  await deps.stripe.subscriptions.update(
    sub.stripeSubscriptionId,
    { items: [{ id: item.id, quantity: args.seats }], proration_behavior: args.seats > sub.quantity ? "always_invoice" : "none" },
    { idempotencyKey: `seats:${sub.stripeSubscriptionId}:${sub.quantity}->${args.seats}:${sub.lastStripeEventId}` },
  );
  await writeAudit(deps.db, { action: "SEATS_CHANGED", actorUserId: args.userId, organizationId: args.organizationId, targetType: "subscription", targetId: sub.id, metadata: { from: sub.quantity, to: args.seats } });
  return { ok: true };
}
