import { describe, expect, it } from "vitest";
import { isQuietTime, nextSendWindow, withinFrequencyCaps } from "@/server/email/marketing-rules";

const at = (iso: string) => new Date(iso);
const DAY = 24 * 60 * 60 * 1000;

describe("marketing quiet hours (docs/09 § 4, Copenhagen time)", () => {
  it("allows weekdays 08:00–19:59 and blocks evenings, nights, Sundays and holidays", () => {
    expect(isQuietTime(at("2026-10-13T06:00:00Z"))).toBe(false); // Tue 08:00
    expect(isQuietTime(at("2026-10-13T17:59:00Z"))).toBe(false); // Tue 19:59
    expect(isQuietTime(at("2026-10-13T18:00:00Z"))).toBe(true); // Tue 20:00
    expect(isQuietTime(at("2026-10-13T05:59:00Z"))).toBe(true); // Tue 07:59
    expect(isQuietTime(at("2026-10-18T10:00:00Z"))).toBe(true); // Sunday
    expect(isQuietTime(at("2026-12-25T10:00:00Z"))).toBe(true); // Juledag (Friday)
  });

  it("defers to 08:00 on the next allowed day", () => {
    expect(nextSendWindow(at("2026-10-13T19:00:00Z")).toISOString()).toBe("2026-10-14T06:00:00.000Z"); // Tue 21:00 → Wed 08:00
    expect(nextSendWindow(at("2026-10-14T03:00:00Z")).toISOString()).toBe("2026-10-14T06:00:00.000Z"); // Wed 05:00 → 08:00 same day
    expect(nextSendWindow(at("2026-10-17T19:00:00Z")).toISOString()).toBe("2026-10-19T06:00:00.000Z"); // Sat 21:00 → Mon (skips Sunday)
    expect(nextSendWindow(at("2026-12-24T19:00:00Z")).toISOString()).toBe("2026-12-28T07:00:00.000Z"); // 24/12 evening → Mon 28/12 (25, 26 holiday, 27 Sunday)
    const open = at("2026-10-13T09:00:00Z");
    expect(nextSendWindow(open)).toBe(open);
  });
});

describe("marketing frequency caps (2 per 7 days, 6 per 30 days)", () => {
  const now = at("2026-10-13T09:00:00Z");
  const ago = (days: number) => new Date(now.getTime() - days * DAY);

  it("allows a 2nd mail within 7 days but not a 3rd", () => {
    expect(withinFrequencyCaps([ago(2)], now)).toBe(true);
    expect(withinFrequencyCaps([ago(2), ago(6)], now)).toBe(false);
    expect(withinFrequencyCaps([ago(2), ago(8)], now)).toBe(true);
  });

  it("allows at most 6 within 30 days", () => {
    expect(withinFrequencyCaps([ago(8), ago(10), ago(15), ago(20), ago(25)], now)).toBe(true);
    expect(withinFrequencyCaps([ago(8), ago(10), ago(15), ago(20), ago(25), ago(29)], now)).toBe(false);
    expect(withinFrequencyCaps([ago(8), ago(10), ago(15), ago(20), ago(25), ago(31)], now)).toBe(true);
  });
});
