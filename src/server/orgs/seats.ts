import { format } from "@/lib/i18n";
import { orgAdminMessages } from "@/lib/i18n/da-admin";

// Seat rule (docs/00-beslutninger.md § 10a, docs/03 § 3): active memberships (no deactivatedAt, all roles)
// + open invitations ≤ Organization.seatLimit. Pure, so M6's Better Auth hooks can reuse the exact same rule.

export interface SeatUsage {
  seatLimit: number;
  activeMembers: number;
  openInvitations: number;
}

export type SeatDecision =
  | { ok: true; used: number; free: number }
  | { ok: false; code: "SEAT_LIMIT_REACHED"; used: number; free: number; requested: number; message: string };

export function seatsUsed(u: SeatUsage): number {
  return u.activeMembers + u.openInvitations;
}

/** May `requested` more seats be taken (new invitations or direct joins)? */
export function checkSeats(u: SeatUsage, requested = 1): SeatDecision {
  const used = seatsUsed(u);
  const free = Math.max(0, u.seatLimit - used);
  if (requested <= free) return { ok: true, used, free };
  const t = orgAdminMessages.seats;
  const message =
    free === 0
      ? format(t.full, { limit: u.seatLimit })
      : format(t.notEnough, { limit: u.seatLimit, free, requested });
  return { ok: false, code: "SEAT_LIMIT_REACHED", used, free, requested, message };
}
