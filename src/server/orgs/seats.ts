import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { format, getMessages } from "@/lib/i18n";
import { getEntitlements } from "@/server/billing/entitlements";
import { decideSeat } from "@/server/billing/seats";

// Seat rule (docs/00-beslutninger.md § 10a): active memberships (all roles) + open invitations ≤ the plan's seats.
// The rule itself lives in M6 (src/server/billing/seats.ts, also wired into Better Auth's beforeCreateInvitation);
// this module only generalises it to batches (several email invitations at once) and to link/domain joins.

export type SeatsDecision =
  | { ok: true; used: number; free: number }
  | { ok: false; code: "SEAT_LIMIT_REACHED" | "READ_ONLY"; used: number; free: number; requested: number; message: string };

/** Pure: may `requested` more seats be taken? requested = 1 is exactly billing's decideSeat. */
export function decideSeats(args: { used: number; limit: number; readOnly: boolean; requested: number }): SeatsDecision {
  const free = Math.max(0, args.limit - args.used);
  if (args.requested <= 0) return { ok: true, used: args.used, free };
  const d = decideSeat({ used: args.used + args.requested - 1, limit: args.limit, readOnly: args.readOnly });
  if (d.allowed) return { ok: true, used: args.used, free };
  const billing = getMessages().billing.seats;
  const message =
    d.reason === "READ_ONLY"
      ? billing.readOnly
      : args.requested > 1 && free > 0
        ? format(getMessages().orgAdmin.seats.notEnough, { limit: args.limit, free, requested: args.requested })
        : format(billing.limitReached, { limit: args.limit });
  return { ok: false, code: d.reason, used: args.used, free, requested: args.requested, message };
}

type Db = PrismaClient | Prisma.TransactionClient;

/** Seats in use (same counting as billing's seatUsage), usable inside a transaction. */
export async function seatsInUse(db: Db, organizationId: string, now = new Date()): Promise<number> {
  const [members, invitations] = await Promise.all([
    db.membership.count({ where: { organizationId, deactivatedAt: null } }),
    db.invitation.count({ where: { organizationId, status: "pending", expiresAt: { gt: now } } }),
  ]);
  return members + invitations;
}

/** Plan limit + read-only state from M6's entitlements (Subscription.quantity / trial seats). */
export async function seatLimitOf(db: PrismaClient, organizationId: string, now = new Date()): Promise<{ limit: number; readOnly: boolean }> {
  const ent = await getEntitlements(db, organizationId, now);
  return { limit: ent.seatLimit, readOnly: ent.readOnly };
}
