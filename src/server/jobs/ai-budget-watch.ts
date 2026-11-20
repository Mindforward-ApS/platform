import * as Sentry from "@sentry/nextjs";
import { serverEnv } from "@/lib/env";
import { runBudgetWatch } from "@/server/ai/budget-watch";
import { db } from "@/server/db";
import { inngest } from "./client";
import { cronFailureHandler, cronTrigger, reportCronOk, type CronMonitor } from "./monitor";

// ai.budget-watch (docs/02 § 5): hourly at :05. Idempotent by design — every alert is a compare-and-set on
// BudgetMonth (alert80SentAt / alert100SentAt / degradedAt), so retries and overlapping runs send at most once.
export const AI_BUDGET_WATCH_MONITOR: CronMonitor = { slug: "ai-budget-watch", schedule: "5 * * * *", maxRuntimeMinutes: 10 };

export const aiBudgetWatchJob = inngest.createFunction(
  { id: "ai.budget-watch", retries: 3, triggers: { cron: cronTrigger(AI_BUDGET_WATCH_MONITOR) }, onFailure: cronFailureHandler(AI_BUDGET_WATCH_MONITOR) },
  async ({ step }) => {
    const result = await step.run("check-global-budget", async () => {
      const r = await runBudgetWatch({ db: db(), env: serverEnv(), notify: (message, level) => Sentry.captureMessage(message, level) });
      return { month: r.state.month, pct: Math.round(r.state.pct * 1000) / 10, level: r.state.level, alert80Sent: r.alert80Sent, alert100Sent: r.alert100Sent, degradedOn: r.degradedSwitchedOn, degradedOff: r.degradedSwitchedOff };
    });
    await reportCronOk(step, AI_BUDGET_WATCH_MONITOR);
    return result;
  },
);
