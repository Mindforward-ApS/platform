import { describe, expect, it } from "vitest";
import { composeUserPackage, orderNews, packageStatus, tierAllows, type NewsCandidate, type PracticedModule } from "@/server/modules/monthly-cycle";
import { cphParts, danishHolidays, isDanishHoliday, monthKey, monthRange, previousMonthKey } from "@/server/modules/monthly-clock";

const d = (iso: string) => new Date(iso);
const news = (moduleId: string, minutes: number, extra: Partial<NewsCandidate> = {}): NewsCandidate => ({
  moduleId,
  sortOrder: 0,
  publishedAt: d("2026-10-05T10:00:00Z"),
  estimatedMinutes: minutes,
  requiredLicense: null,
  ...extra,
});
const passed = (moduleId: string, minutes: number, passedAt: string, lastPracticedAt = passedAt, extra: Partial<PracticedModule> = {}): PracticedModule => ({
  moduleId,
  passedAt: d(passedAt),
  lastPracticedAt: d(lastPracticedAt),
  estimatedMinutes: minutes,
  requiredLicense: null,
  ...extra,
});

describe("orderNews (cycle priority)", () => {
  it("is deterministic regardless of input order: sortOrder, newest first, then id", () => {
    const a = news("a", 3, { sortOrder: 1 });
    const b = news("b", 3, { sortOrder: 0, publishedAt: d("2026-10-01T00:00:00Z") });
    const c = news("c", 3, { sortOrder: 0, publishedAt: d("2026-10-20T00:00:00Z") });
    const e = news("e", 3, { sortOrder: 0, publishedAt: d("2026-10-20T00:00:00Z") });
    const expected = ["c", "e", "b", "a"];
    expect(orderNews([a, b, c, e]).map((x) => x.moduleId)).toEqual(expected);
    expect(orderNews([e, a, c, b]).map((x) => x.moduleId)).toEqual(expected);
  });
});

describe("tierAllows (Copilot tiers)", () => {
  it("only filters on the COPILOT track", () => {
    expect(tierAllows("CHATGPT", null, "COPILOT_M365")).toBe(true);
    expect(tierAllows("COPILOT", null, null)).toBe(true);
    expect(tierAllows("COPILOT", null, "COPILOT_CHAT")).toBe(true);
    expect(tierAllows("COPILOT", "COPILOT_CHAT", "COPILOT_M365")).toBe(false);
    expect(tierAllows("COPILOT", "UNKNOWN", "COPILOT_M365")).toBe(false);
    expect(tierAllows("COPILOT", "COPILOT_CHAT", "UNKNOWN")).toBe(false);
    expect(tierAllows("COPILOT", "COPILOT_M365", "COPILOT_M365")).toBe(true);
    expect(tierAllows("COPILOT", "COPILOT_M365", "UNKNOWN")).toBe(true);
  });
});

describe("composeUserPackage", () => {
  const base = { track: "CHATGPT" as const, licenseTier: null };

  it("NEWS + exactly one refresher: the passed module practised longest ago", () => {
    const pkg = composeUserPackage({
      ...base,
      news: [news("n1", 4), news("n2", 4)],
      passed: [passed("p-new", 5, "2026-09-01T00:00:00Z"), passed("p-old", 5, "2026-03-01T00:00:00Z"), passed("p-retaken", 5, "2026-01-01T00:00:00Z", "2026-09-20T00:00:00Z")],
    });
    expect(pkg).toEqual({ moduleIds: ["n1", "n2"], refresherModuleId: "p-old", estimatedMinutes: 13 });
  });

  it("stays within 15 minutes by dropping the lowest-priority NEWS", () => {
    const pkg = composeUserPackage({ ...base, news: [news("n1", 5), news("n2", 5), news("n3", 5)], passed: [passed("p", 5, "2026-01-01T00:00:00Z")] });
    expect(pkg.moduleIds).toEqual(["n1", "n2"]);
    expect(pkg.estimatedMinutes).toBe(15);
  });

  it("never exceeds the limit for any input (property check)", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 200; i++) {
      const n = Array.from({ length: Math.floor(rnd() * 8) }, (_, k) => news(`n${k}`, 1 + Math.floor(rnd() * 20)));
      const p = Array.from({ length: Math.floor(rnd() * 5) }, (_, k) => passed(`p${k}`, 1 + Math.floor(rnd() * 25), `2026-0${1 + k}-01T00:00:00Z`));
      const pkg = composeUserPackage({ ...base, news: n, passed: p });
      expect(pkg.estimatedMinutes).toBeLessThanOrEqual(15);
      expect(composeUserPackage({ ...base, news: n, passed: [...p].reverse() })).toEqual(pkg);
    }
  });

  it("is deterministic on ties (same passedAt → module id)", () => {
    const p = [passed("b", 5, "2026-01-01T00:00:00Z"), passed("a", 5, "2026-01-01T00:00:00Z")];
    expect(composeUserPackage({ ...base, news: [], passed: p }).refresherModuleId).toBe("a");
    expect(composeUserPackage({ ...base, news: [], passed: [...p].reverse() }).refresherModuleId).toBe("a");
  });

  it("skips NEWS the learner already passed and never uses a cycle NEWS as refresher", () => {
    const pkg = composeUserPackage({ ...base, news: [news("n1", 3), news("n2", 3)], passed: [passed("n1", 3, "2026-01-01T00:00:00Z")] });
    expect(pkg).toEqual({ moduleIds: ["n2"], refresherModuleId: null, estimatedMinutes: 3 });
  });

  it("filters by the learner's Copilot tier (NEWS and refresher)", () => {
    const input = {
      track: "COPILOT" as const,
      news: [news("chat", 3, { requiredLicense: "COPILOT_CHAT" }), news("paid", 3, { requiredLicense: "COPILOT_M365" }), news("unknown", 3, { requiredLicense: "UNKNOWN" })],
      passed: [passed("paid-old", 3, "2026-01-01T00:00:00Z", undefined, { requiredLicense: "COPILOT_M365" }), passed("free-newer", 3, "2026-05-01T00:00:00Z")],
    };
    expect(composeUserPackage({ ...input, licenseTier: "COPILOT_CHAT" })).toEqual({ moduleIds: ["chat"], refresherModuleId: "free-newer", estimatedMinutes: 6 });
    expect(composeUserPackage({ ...input, licenseTier: "COPILOT_M365" })).toEqual({ moduleIds: ["chat", "paid", "unknown"], refresherModuleId: "paid-old", estimatedMinutes: 12 });
  });

  it("does not pick a refresher longer than the whole package limit", () => {
    expect(composeUserPackage({ ...base, news: [], passed: [passed("long", 20, "2026-01-01T00:00:00Z")] }).refresherModuleId).toBeNull();
  });
});

describe("packageStatus", () => {
  const p = { moduleIds: ["n1", "n2"], refresherModuleId: "r", passedModuleIds: new Set<string>(), practicedSinceAssigned: new Set<string>(), started: false };
  it("PENDING → IN_PROGRESS → COMPLETED", () => {
    expect(packageStatus(p)).toBe("PENDING");
    expect(packageStatus({ ...p, started: true })).toBe("IN_PROGRESS");
    expect(packageStatus({ ...p, passedModuleIds: new Set(["n1", "n2"]) })).toBe("IN_PROGRESS");
    expect(packageStatus({ ...p, passedModuleIds: new Set(["n1", "n2"]), practicedSinceAssigned: new Set(["r"]) })).toBe("COMPLETED");
  });
});

describe("monthly clock (Europe/Copenhagen)", () => {
  it("month key uses the Copenhagen calendar", () => {
    expect(monthKey(d("2026-10-31T22:30:00Z"))).toBe("2026-10"); // 23:30 local on 31 Oct
    expect(monthKey(d("2026-10-31T23:30:00Z"))).toBe("2026-11"); // 00:30 local on 1 Nov, still 31 Oct in UTC
    expect(monthKey(d("2026-12-31T22:59:00Z"))).toBe("2026-12");
    expect(monthKey(d("2026-12-31T23:00:00Z"))).toBe("2027-01");
  });

  it("month range is [local midnight day 1, next month) across DST", () => {
    const r = monthRange("2026-10");
    expect(r.start.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(previousMonthKey("2027-01")).toBe("2026-12");
  });

  it("local parts include hour and weekday", () => {
    expect(cphParts(d("2026-10-13T06:45:00Z"))).toEqual({ year: 2026, month: 10, day: 13, hour: 8, weekday: 2 });
  });

  it("knows Danish public holidays (Easter-relative and fixed)", () => {
    const h = danishHolidays(2027); // Easter Sunday 28 March 2027
    for (const day of ["01-01", "03-25", "03-26", "03-28", "03-29", "05-06", "05-16", "05-17", "12-25", "12-26"]) expect(h.has(day)).toBe(true);
    expect(isDanishHoliday(d("2026-12-25T10:00:00Z"))).toBe(true);
    expect(isDanishHoliday(d("2026-10-13T10:00:00Z"))).toBe(false);
  });
});
