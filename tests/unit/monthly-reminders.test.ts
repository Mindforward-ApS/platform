import { describe, expect, it } from "vitest";
import { reminderDayFor, reminderDecision, reminderIdempotencyKey, type ReminderCandidate } from "@/server/modules/monthly-reminders";

// Fake clock: 08:45 Copenhagen (cron time) on the given November 2026 day (CET = UTC+1).
const nov = (day: number, hourUtc = 7) => new Date(Date.UTC(2026, 10, day, hourUtc, 45));

const open: ReminderCandidate = {
  status: "PENDING",
  remindersEnabled: true,
  seatActive: true,
  entitled: true,
  cycleMonth: "2026-11",
  sentAt: { 1: null, 14: null, 25: null },
};

describe("reminderDayFor (fake clock, Copenhagen calendar)", () => {
  it("is 1, 14 or 25 only", () => {
    const days = Array.from({ length: 30 }, (_, i) => reminderDayFor(nov(i + 1))).map((d, i) => (d ? i + 1 : null)).filter(Boolean);
    expect(days).toEqual([1, 14, 25]);
  });

  it("uses the Copenhagen date, not UTC", () => {
    expect(reminderDayFor(new Date(Date.UTC(2026, 9, 31, 23, 30)))).toBe(1); // 00:30 on 1 Nov in Copenhagen
    expect(reminderDayFor(new Date(Date.UTC(2026, 10, 13, 23, 30)))).toBe(14);
  });
});

describe("reminderDecision", () => {
  it("sends on day 1, 14 and 25 to a learner who has not completed", () => {
    expect(reminderDecision(open, nov(1))).toEqual({ send: true, day: 1 });
    expect(reminderDecision({ ...open, status: "IN_PROGRESS" }, nov(14))).toEqual({ send: true, day: 14 });
    expect(reminderDecision(open, nov(25))).toEqual({ send: true, day: 25 });
  });

  it("never on other days", () => {
    for (const day of [2, 13, 15, 24, 26, 30]) expect(reminderDecision(open, nov(day))).toEqual({ send: false, reason: "NOT_A_REMINDER_DAY" });
  });

  it("not to learners who completed the package", () => {
    expect(reminderDecision({ ...open, status: "COMPLETED" }, nov(14))).toEqual({ send: false, reason: "COMPLETED" });
  });

  it("not to learners who switched reminders off", () => {
    expect(reminderDecision({ ...open, remindersEnabled: false }, nov(1))).toEqual({ send: false, reason: "OPTED_OUT" });
  });

  it("not without an active, entitled seat, nor for another month's package, nor twice", () => {
    expect(reminderDecision({ ...open, seatActive: false }, nov(14)).send).toBe(false);
    expect(reminderDecision({ ...open, entitled: false }, nov(14)).send).toBe(false);
    expect(reminderDecision({ ...open, cycleMonth: "2026-10" }, nov(14))).toEqual({ send: false, reason: "OTHER_MONTH" });
    expect(reminderDecision({ ...open, sentAt: { ...open.sentAt, 14: nov(14) } }, nov(14))).toEqual({ send: false, reason: "ALREADY_SENT" });
  });

  it("uses the documented idempotency key", () => {
    expect(reminderIdempotencyKey("ma_1", 14)).toBe("reminder:ma_1:14");
  });
});
