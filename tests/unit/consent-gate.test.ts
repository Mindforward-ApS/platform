import { describe, expect, it } from "vitest";
import {
  consentTextHash,
  decideMarketing,
  emailHash,
  normalizeEmail,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/server/email/consent";
import { MARKETING_CONSENT } from "@/lib/legal/marketing-consent";

const t0 = new Date("2026-10-01T10:00:00Z");
const at = (minutes: number) => new Date(t0.getTime() + minutes * 60_000);
const row = (id: string, action: "GRANTED" | "CONFIRMED" | "WITHDRAWN", minutes: number) => ({ id, action, createdAt: at(minutes) });

// docs/09 § 2.1: MARKETING needs the LATEST ConsentRecord for (email, MARKETING_EMAIL, EMAIL) to be CONFIRMED
// and no suppression. Rows are passed newest-first or in any order — the gate sorts itself.
describe("decideMarketing (consent gate)", () => {
  it("blocks when there is no consent at all (test-only lead)", () => {
    expect(decideMarketing([], false)).toEqual({ allowed: false, reason: "NO_CONSENT" });
  });

  it("blocks a ticked checkbox without the double opt-in click (GRANTED only)", () => {
    expect(decideMarketing([row("g", "GRANTED", 0)], false)).toEqual({ allowed: false, reason: "NOT_CONFIRMED" });
  });

  it("allows only when the latest record is CONFIRMED and returns its id", () => {
    expect(decideMarketing([row("g", "GRANTED", 0), row("c", "CONFIRMED", 5)], false)).toEqual({ allowed: true, consentRecordId: "c" });
  });

  it("WITHDRAWN after CONFIRMED blocks immediately", () => {
    expect(decideMarketing([row("g", "GRANTED", 0), row("c", "CONFIRMED", 5), row("w", "WITHDRAWN", 6)], false)).toEqual({ allowed: false, reason: "WITHDRAWN" });
  });

  it("a new unconfirmed GRANTED after WITHDRAWN does not revive the old confirmation", () => {
    const rows = [row("g1", "GRANTED", 0), row("c1", "CONFIRMED", 1), row("w", "WITHDRAWN", 2), row("g2", "GRANTED", 3)];
    expect(decideMarketing(rows, false)).toEqual({ allowed: false, reason: "NOT_CONFIRMED" });
  });

  it("suppression blocks even a valid CONFIRMED consent", () => {
    expect(decideMarketing([row("g", "GRANTED", 0), row("c", "CONFIRMED", 5)], true)).toEqual({ allowed: false, reason: "SUPPRESSED" });
  });

  it("on a timestamp tie, WITHDRAWN wins over CONFIRMED (fail closed)", () => {
    expect(decideMarketing([row("c", "CONFIRMED", 5), row("w", "WITHDRAWN", 5)], false)).toEqual({ allowed: false, reason: "WITHDRAWN" });
    expect(decideMarketing([row("c", "CONFIRMED", 5), row("g", "GRANTED", 5)], false)).toEqual({ allowed: false, reason: "NOT_CONFIRMED" });
  });

  it("a CONFIRMED in the same millisecond as the GRANTED it confirms supersedes it", () => {
    expect(decideMarketing([row("g", "GRANTED", 5), { ...row("c", "CONFIRMED", 5), grantId: "g" }], false)).toEqual({ allowed: true, consentRecordId: "c" });
  });
});

describe("consent helpers", () => {
  it("normalizes emails (lowercase + trim)", () => {
    expect(normalizeEmail("  Lene@Example.TEST ")).toBe("lene@example.test");
  });

  it("hashes the exact consent text (sha256)", () => {
    expect(consentTextHash(MARKETING_CONSENT.text)).toMatch(/^[0-9a-f]{64}$/);
    expect(consentTextHash(MARKETING_CONSENT.text)).not.toBe(consentTextHash(`${MARKETING_CONSENT.text} `));
  });

  it("peppers the suppression hash and normalizes first", () => {
    const pepper = "pepper-pepper-pepper";
    expect(emailHash("A@b.test", pepper)).toBe(emailHash("a@b.test ", pepper));
    expect(emailHash("a@b.test", pepper)).not.toBe(emailHash("a@b.test", "other-pepper-other"));
  });
});

describe("unsubscribe tokens (HMAC, no login)", () => {
  const secret = "s".repeat(32);

  it("round-trips the normalized email", () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken("Lene@Example.test", secret), secret)).toBe("lene@example.test");
  });

  it("rejects a tampered email or signature and a token signed with another secret", () => {
    const token = signUnsubscribeToken("lene@example.test", secret);
    const [v, , sig] = token.split(".");
    const otherEmail = Buffer.from("mette@example.test").toString("base64url");
    expect(verifyUnsubscribeToken(`${v}.${otherEmail}.${sig}`, secret)).toBeNull();
    expect(verifyUnsubscribeToken(`${token}x`, secret)).toBeNull();
    expect(verifyUnsubscribeToken(token, "o".repeat(32))).toBeNull();
    expect(verifyUnsubscribeToken("garbage", secret)).toBeNull();
  });
});
