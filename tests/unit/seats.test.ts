import { describe, expect, it } from "vitest";
import { decideSeat } from "@/server/billing/seats";
import { decideSeats } from "@/server/orgs/seats";

// Seat rule: active memberships + open invitations ≤ seats (§ 10a). M7's batch/join variant delegates to M6's rule.

describe("decideSeats (batch + join variant of billing's decideSeat)", () => {
  it("allows filling the last free seat", () => {
    expect(decideSeats({ used: 4, limit: 5, readOnly: false, requested: 1 })).toEqual({ ok: true, used: 4, free: 1 });
  });

  it("agrees with billing's decideSeat for a single seat", () => {
    for (const used of [0, 3, 4, 5, 6]) {
      for (const readOnly of [false, true]) {
        expect(decideSeats({ used, limit: 5, readOnly, requested: 1 }).ok).toBe(decideSeat({ used, limit: 5, readOnly }).allowed);
      }
    }
  });

  it("rejects one over the limit with a Danish explanation", () => {
    const d = decideSeats({ used: 5, limit: 5, readOnly: false, requested: 1 });
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.code).toBe("SEAT_LIMIT_REACHED");
    expect(d.message).toContain("Alle 5 pladser er i brug");
  });

  it("rejects a batch larger than the free seats and says how many are free", () => {
    const d = decideSeats({ used: 2, limit: 5, readOnly: false, requested: 4 });
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.free).toBe(3);
    expect(d.message).toContain("3 ledige pladser af 5");
    expect(d.message).toContain("tilføje 4");
  });

  it("read-only orgs (trial ended / canceled) cannot add anyone", () => {
    const d = decideSeats({ used: 0, limit: 5, readOnly: true, requested: 1 });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.code).toBe("READ_ONLY");
  });

  it("never reports negative free seats when an org is already over its limit", () => {
    const d = decideSeats({ used: 7, limit: 5, readOnly: false, requested: 1 });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.free).toBe(0);
  });
});
