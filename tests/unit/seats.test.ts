import { describe, expect, it } from "vitest";
import { checkSeats, seatsUsed } from "@/server/orgs/seats";

describe("seat rule: active memberships + open invitations ≤ seatLimit", () => {
  it("counts members and open invitations together", () => {
    expect(seatsUsed({ seatLimit: 5, activeMembers: 3, openInvitations: 1 })).toBe(4);
  });

  it("allows filling the last free seat", () => {
    expect(checkSeats({ seatLimit: 5, activeMembers: 3, openInvitations: 1 }, 1)).toEqual({ ok: true, used: 4, free: 1 });
  });

  it("rejects one over the limit with a Danish explanation", () => {
    const d = checkSeats({ seatLimit: 5, activeMembers: 4, openInvitations: 1 }, 1);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.code).toBe("SEAT_LIMIT_REACHED");
    expect(d.message).toContain("Alle 5 pladser er i brug");
    expect(d.message).toContain("Tilføj flere pladser");
  });

  it("rejects a batch larger than the free seats and says how many are free", () => {
    const d = checkSeats({ seatLimit: 5, activeMembers: 2, openInvitations: 0 }, 4);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.free).toBe(3);
    expect(d.message).toContain("3 ledige pladser af 5");
    expect(d.message).toContain("tilføje 4");
  });

  it("never reports negative free seats when an org is already over its limit (e.g. seats lowered)", () => {
    const d = checkSeats({ seatLimit: 5, activeMembers: 7, openInvitations: 0 }, 1);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.free).toBe(0);
  });

  it("a PERSONAL org (1 seat, owner) has no room", () => {
    expect(checkSeats({ seatLimit: 1, activeMembers: 1, openInvitations: 0 }).ok).toBe(false);
  });
});
