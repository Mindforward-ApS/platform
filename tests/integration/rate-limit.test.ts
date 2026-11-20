import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { consumeRateLimit, peekRateLimit } from "@/server/security/rate-limit";
import { testDb } from "./helpers";

const rule = { window: 900, max: 5 };

describe("consumeRateLimit (Postgres)", () => {
  it("allows max requests per window, then blocks", async () => {
    const key = `t:${randomUUID()}`;
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await consumeRateLimit(testDb(), key, rule, 1_000_000));
    expect(results.slice(0, 5).every((r) => r.allowed)).toBe(true);
    expect(results[5]).toEqual({ allowed: false, retryAfter: 900 });
  });

  it("resets after the window has passed", async () => {
    const key = `t:${randomUUID()}`;
    for (let i = 0; i < 6; i++) await consumeRateLimit(testDb(), key, rule, 1_000_000);
    const later = await consumeRateLimit(testDb(), key, rule, 1_000_000 + 900_000);
    expect(later.allowed).toBe(true);
  });

  it("cannot be bypassed with concurrent requests", async () => {
    const key = `t:${randomUUID()}`;
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit(testDb(), key, rule, 2_000_000)));
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });
});

describe("peekRateLimit", () => {
  it("says whether one more request would pass, without counting", async () => {
    const key = `p:${randomUUID()}`;
    expect((await peekRateLimit(testDb(), key, rule, 1_000_000)).allowed).toBe(true);
    for (let i = 0; i < 5; i++) await consumeRateLimit(testDb(), key, rule, 1_000_000);
    expect(await peekRateLimit(testDb(), key, rule, 1_000_000)).toEqual({ allowed: false, retryAfter: 900 });
    expect(await peekRateLimit(testDb(), key, rule, 1_000_000)).toEqual({ allowed: false, retryAfter: 900 });
    expect((await peekRateLimit(testDb(), key, rule, 1_000_000 + 900_001)).allowed).toBe(true);
    expect((await testDb().rateLimit.findUniqueOrThrow({ where: { key } })).count).toBe(5);
  });
});
