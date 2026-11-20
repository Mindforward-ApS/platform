import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { assignCycleBatch, composeCycles, type AssignBatchResult } from "@/server/modules/monthly-cycle";
import { sendMonthlyReminders } from "@/server/modules/monthly-reminders";
import { logger } from "@/server/observability/logger";
import { inngest } from "./client";

// Monthly cycle jobs (docs/02 § 5). Cron in Europe/Copenhagen. Every body is idempotent: cycles are unique per
// (month, track), assignments per (cycle, user, org), reminders per EmailMessage.idempotencyKey.

export const CYCLE_COMPOSED = "monthly/cycle.composed";

export const monthlyComposeCyclesJob = inngest.createFunction(
  { id: "monthly.compose-cycles", retries: 3, triggers: [{ cron: "TZ=Europe/Copenhagen 30 0 1 * *" }] },
  async ({ step }) => {
    const cycles = await step.run("compose", () => composeCycles(db()));
    if (cycles.length > 0) {
      // Event id = idempotency key cycle:{month}:{trackId} → Inngest drops duplicate events (24 h window).
      await step.sendEvent(
        "fan-out",
        cycles.map((c) => ({ name: CYCLE_COMPOSED, id: `cycle:${c.month}:${c.trackId}`, data: { cycleId: c.cycleId } })),
      );
    }
    return { cycles: cycles.length };
  },
);

export const monthlyAssignUsersJob = inngest.createFunction(
  { id: "monthly.assign-users", retries: 3, idempotency: "event.data.cycleId", triggers: { event: CYCLE_COMPOSED } },
  async ({ event, step }) => {
    const { cycleId } = z.object({ cycleId: z.string().min(1) }).parse(event.data);
    let cursor: string | null = null;
    let created = 0;
    for (let page = 0; page < 10_000; page++) {
      const current: string | null = cursor;
      const res: AssignBatchResult = await step.run(`batch-${page}`, (): Promise<AssignBatchResult> => assignCycleBatch(db(), { cycleId, cursor: current }));
      created += res.created;
      cursor = res.nextCursor;
      if (!cursor) break;
    }
    logger.info("monthly.assigned", { cycleId, created });
    return { created };
  },
);

export const monthlyRemindersJob = inngest.createFunction(
  { id: "monthly.reminders", retries: 3, triggers: [{ cron: "TZ=Europe/Copenhagen 45 8 * * *" }] },
  async ({ step }) => {
    let cursor: string | null = null;
    let sent = 0;
    for (let page = 0; page < 10_000; page++) {
      const current: string | null = cursor;
      const res: { sent: number; day: number | null; nextCursor: string | null } = await step.run(`page-${page}`, async () => {
        const r = await sendMonthlyReminders(db(), { cursor: current });
        return { sent: r.sent, day: r.day, nextCursor: r.nextCursor };
      });
      sent += res.sent;
      cursor = res.nextCursor;
      if (!res.day || !cursor) break;
    }
    return { sent };
  },
);
