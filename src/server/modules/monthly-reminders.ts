import "server-only";
import type { MonthlyAssignmentStatus, PrismaClient } from "@/generated/prisma/client";
import { monthlyConfig, type ReminderDay } from "@/lib/config/monthly";
import { serverEnv } from "@/lib/env";
import { getEntitlements } from "@/server/billing/entitlements";
import { sendServiceEmail, type SendOptions } from "@/server/email/send";
import { logger } from "@/server/observability/logger";
import { cphParts, monthKey, monthRange } from "./monthly-clock";
import { syncMonthlyProgress } from "./monthly-cycle";

// Monthly training reminders (docs/09 § 5, docs/02 § 5 monthly.reminders, cron 08:45 Copenhagen).
// SERVICE mails on day 1 ("your package is ready"), 14 and 25 — only to learners who have not completed the
// package, still have an active, entitled seat and have not switched reminders off. Never offers.
// Idempotency key: reminder:{monthlyAssignmentId}:{1|14|25} (EmailMessage.idempotencyKey is unique).

/** The reminder day for `now` (Copenhagen calendar), or null on every other day. */
export function reminderDayFor(now: Date): ReminderDay | null {
  const { day } = cphParts(now);
  return (monthlyConfig.reminderDays as readonly number[]).includes(day) ? (day as ReminderDay) : null;
}

export interface ReminderCandidate {
  status: MonthlyAssignmentStatus;
  remindersEnabled: boolean;
  seatActive: boolean;
  entitled: boolean;
  cycleMonth: string;
  sentAt: Record<ReminderDay, Date | null>;
}

export type ReminderSkip = "NOT_A_REMINDER_DAY" | "OTHER_MONTH" | "COMPLETED" | "OPTED_OUT" | "NO_SEAT" | "NOT_ENTITLED" | "ALREADY_SENT";

/** Pure decision for one assignment on one day. */
export function reminderDecision(c: ReminderCandidate, now: Date): { send: true; day: ReminderDay } | { send: false; reason: ReminderSkip } {
  const day = reminderDayFor(now);
  if (!day) return { send: false, reason: "NOT_A_REMINDER_DAY" };
  if (c.cycleMonth !== monthKey(now)) return { send: false, reason: "OTHER_MONTH" };
  if (c.status === "COMPLETED") return { send: false, reason: "COMPLETED" };
  if (!c.remindersEnabled) return { send: false, reason: "OPTED_OUT" };
  if (!c.seatActive) return { send: false, reason: "NO_SEAT" };
  if (!c.entitled) return { send: false, reason: "NOT_ENTITLED" };
  if (c.sentAt[day]) return { send: false, reason: "ALREADY_SENT" };
  return { send: true, day };
}

export const reminderIdempotencyKey = (monthlyAssignmentId: string, day: ReminderDay) => `reminder:${monthlyAssignmentId}:${day}`;

const SENT_FIELD = { 1: "reminderDay1SentAt", 14: "reminderDay14SentAt", 25: "reminderDay25SentAt" } as const;
const monthLabelFmt = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", month: "long", year: "numeric" });

export interface ReminderRunResult {
  day: ReminderDay | null;
  sent: number;
  skipped: Partial<Record<ReminderSkip, number>>;
  nextCursor: string | null;
}

/** One page of the daily reminder run (ordered by id). Safe to re-run: the idempotency key dedups. */
export async function sendMonthlyReminders(
  db: PrismaClient,
  opts: { now?: Date; cursor?: string | null; batchSize?: number; appUrl?: string; send?: SendOptions } = {},
): Promise<ReminderRunResult> {
  const now = opts.now ?? new Date();
  const day = reminderDayFor(now);
  const result: ReminderRunResult = { day, sent: 0, skipped: {}, nextCursor: null };
  if (!day) return result;
  const skip = (r: ReminderSkip) => (result.skipped[r] = (result.skipped[r] ?? 0) + 1);

  const month = monthKey(now);
  const take = opts.batchSize ?? monthlyConfig.assignBatchSize;
  const rows = await db.monthlyAssignment.findMany({
    where: { cycle: { month }, status: { not: "COMPLETED" }, [SENT_FIELD[day]]: null, ...(opts.cursor ? { id: { gt: opts.cursor } } : {}) },
    orderBy: { id: "asc" },
    take,
    select: {
      id: true,
      userId: true,
      organizationId: true,
      moduleIds: true,
      refresherModuleId: true,
      estimatedMinutes: true,
      reminderDay1SentAt: true,
      reminderDay14SentAt: true,
      reminderDay25SentAt: true,
      cycle: { select: { month: true } },
      user: { select: { email: true, trainingRemindersEnabled: true, deletionRequestedAt: true } },
    },
  });
  result.nextCursor = rows.length === take ? (rows.at(-1)?.id ?? null) : null;

  const appUrl = opts.appUrl ?? serverEnv().APP_URL;
  const entitledCache = new Map<string, boolean>();
  const monthLabel = monthLabelFmt.format(monthRange(month).start);

  for (const row of rows) {
    // Re-check completion right before sending (the learner may have finished since the last sync).
    await syncMonthlyProgress(db, { userId: row.userId, organizationId: row.organizationId }, now);
    const fresh = await db.monthlyAssignment.findUniqueOrThrow({ where: { id: row.id }, select: { status: true } });
    const seat = await db.membership.findFirst({
      where: { userId: row.userId, organizationId: row.organizationId, deactivatedAt: null, organization: { deletedAt: null } },
      select: { id: true },
    });
    if (!entitledCache.has(row.organizationId)) entitledCache.set(row.organizationId, (await getEntitlements(db, row.organizationId, now)).monthlyCycle);

    const decision = reminderDecision(
      {
        status: fresh.status,
        remindersEnabled: row.user.trainingRemindersEnabled,
        seatActive: Boolean(seat) && !row.user.deletionRequestedAt,
        entitled: entitledCache.get(row.organizationId) ?? false,
        cycleMonth: row.cycle.month,
        sentAt: { 1: row.reminderDay1SentAt, 14: row.reminderDay14SentAt, 25: row.reminderDay25SentAt },
      },
      now,
    );
    if (!decision.send) {
      skip(decision.reason);
      continue;
    }

    const ids = [...row.moduleIds, ...(row.refresherModuleId ? [row.refresherModuleId] : [])];
    const modules = await db.module.findMany({ where: { id: { in: ids } }, select: { id: true, publishedVersion: { select: { title: true, estimatedMinutes: true } } } });
    const info = (id: string) => {
      const v = modules.find((m) => m.id === id)?.publishedVersion;
      return v ? { title: v.title, minutes: v.estimatedMinutes } : null;
    };

    const message = await sendServiceEmail(
      db,
      {
        template: `monthly-training-d${day}`,
        to: row.user.email,
        userId: row.userId,
        organizationId: row.organizationId,
        idempotencyKey: reminderIdempotencyKey(row.id, day),
        vars: {
          url: `${appUrl}${monthlyConfig.packagePath}`,
          settingsUrl: `${appUrl}${monthlyConfig.settingsPath}`,
          month: monthLabel,
          estimatedMinutes: row.estimatedMinutes,
          modules: row.moduleIds.flatMap((id) => info(id) ?? []),
          refresher: row.refresherModuleId ? info(row.refresherModuleId) : null,
        },
      },
      opts.send,
    );
    await db.monthlyAssignment.update({ where: { id: row.id }, data: { [SENT_FIELD[day]]: message.sentAt ?? now } });
    result.sent++;
  }
  logger.info("monthly.reminders_page", { day, sent: result.sent, skipped: result.skipped });
  return result;
}
