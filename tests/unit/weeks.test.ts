import { describe, expect, it } from "vitest";
import { bucketPassesByWeek, isoWeek, lastIsoWeeks } from "@/lib/weeks";

describe("isoWeek", () => {
  it("follows ISO 8601 (weeks start Monday, week 1 holds the first Thursday)", () => {
    expect(isoWeek(2026, 1, 1)).toEqual({ year: 2026, week: 1 }); // Thursday
    expect(isoWeek(2025, 12, 29)).toEqual({ year: 2026, week: 1 }); // Monday of 2026-W01
    expect(isoWeek(2027, 1, 1)).toEqual({ year: 2026, week: 53 }); // Friday, 2026 has 53 weeks
    expect(isoWeek(2026, 10, 16)).toEqual({ year: 2026, week: 42 });
    expect(isoWeek(2026, 10, 12)).toEqual({ year: 2026, week: 42 }); // Monday
    expect(isoWeek(2026, 10, 11)).toEqual({ year: 2026, week: 41 }); // Sunday
  });
});

describe("lastIsoWeeks", () => {
  it("returns n consecutive weeks, oldest first, ending with the current week in Copenhagen", () => {
    const weeks = lastIsoWeeks(new Date("2026-10-16T10:00:00Z"), 12);
    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1)).toEqual({ year: 2026, week: 42 });
    expect(weeks[0]).toEqual({ year: 2026, week: 31 });
  });

  it("uses the Copenhagen calendar day, not UTC", () => {
    // Sunday 23:30 UTC = Monday 01:30 in Copenhagen (CEST) → already the next week.
    expect(lastIsoWeeks(new Date("2026-10-11T23:30:00Z"), 1)).toEqual([{ year: 2026, week: 42 }]);
  });

  it("crosses the year boundary", () => {
    expect(lastIsoWeeks(new Date("2027-01-06T12:00:00Z"), 3)).toEqual([
      { year: 2026, week: 52 },
      { year: 2026, week: 53 },
      { year: 2027, week: 1 },
    ]);
  });
});

describe("bucketPassesByWeek", () => {
  const now = new Date("2026-10-16T10:00:00Z");

  it("counts passes per week with the average score, zero-filled and oldest first", () => {
    const out = bucketPassesByWeek(
      [
        { passedAt: new Date("2026-10-13T09:00:00Z"), scorePct: 80 },
        { passedAt: new Date("2026-10-15T09:00:00Z"), scorePct: 91 },
        { passedAt: new Date("2026-10-07T09:00:00Z"), scorePct: null },
      ],
      now,
      3,
    );
    expect(out).toEqual([
      { year: 2026, week: 40, passed: 0, avgScorePct: null },
      { year: 2026, week: 41, passed: 1, avgScorePct: null },
      { year: 2026, week: 42, passed: 2, avgScorePct: 86 },
    ]);
  });

  it("ignores passes outside the window", () => {
    const out = bucketPassesByWeek([{ passedAt: new Date("2026-01-05T09:00:00Z"), scorePct: 100 }], now, 4);
    expect(out.every((w) => w.passed === 0)).toBe(true);
  });
});
