import { describe, expect, it } from "vitest";
import { evaluateWindow, rateLimitKeys } from "@/server/security/rate-limit";

const rule = { window: 900, max: 5 };

describe("evaluateWindow", () => {
  it("allows up to max requests in a window", () => {
    expect(evaluateWindow({ count: 5, windowStartMs: 0 }, 1_000, rule)).toEqual({ allowed: true, retryAfter: null });
  });

  it("blocks the request after max and reports seconds until the window frees up", () => {
    expect(evaluateWindow({ count: 6, windowStartMs: 0 }, 60_000, rule)).toEqual({ allowed: false, retryAfter: 840 });
  });

  it("never reports a retryAfter below one second", () => {
    expect(evaluateWindow({ count: 6, windowStartMs: 0 }, 899_999, rule).retryAfter).toBe(1);
  });
});

describe("rateLimitKeys", () => {
  it("normalizes email so case and whitespace cannot bypass the limit", () => {
    expect(rateLimitKeys.magicLinkEmail("  Anna@Example.DK ")).toBe(rateLimitKeys.magicLinkEmail("anna@example.dk"));
  });

  it("does not store the raw email in the key", () => {
    expect(rateLimitKeys.magicLinkEmail("anna@example.dk")).not.toContain("anna");
  });
});
