import * as Sentry from "@sentry/nextjs";

// Sentry Cron Monitors for the daily/hourly Inngest crons (docs/02 § 8). Heartbeat style, because Inngest re-runs
// the handler once per step: the "ok" check-in is its own memoized step at the end of a successful run, and the
// function's onFailure handler sends "error" after the final retry. A missed run is detected by Sentry from the
// schedule (upserted with every check-in, so no manual monitor setup is needed). No-op without SENTRY_DSN.

export interface CronMonitor {
  slug: string;
  /** Crontab WITHOUT the TZ= prefix; the timezone is sent separately. */
  schedule: string;
  maxRuntimeMinutes?: number;
}

export const TZ = "Europe/Copenhagen";

export function monitorConfig(m: CronMonitor) {
  return { schedule: { type: "crontab" as const, value: m.schedule }, timezone: TZ, checkinMargin: 15, maxRuntime: m.maxRuntimeMinutes ?? 30, failureIssueThreshold: 1, recoveryThreshold: 1 };
}

export function cronTrigger(m: CronMonitor): string {
  return `TZ=${TZ} ${m.schedule}`;
}

async function checkIn(m: CronMonitor, status: "ok" | "error"): Promise<void> {
  Sentry.captureCheckIn({ monitorSlug: m.slug, status }, monitorConfig(m));
  await Sentry.flush(2000);
}

interface StepLike {
  run: <T>(id: string, fn: () => Promise<T>) => Promise<unknown>;
}

/** Call as the LAST step of a cron function. */
export async function reportCronOk(step: StepLike, m: CronMonitor): Promise<void> {
  await step.run("sentry-cron-ok", async () => {
    await checkIn(m, "ok");
    return true;
  });
}

/** Use as the function's onFailure handler (runs once after all retries failed). */
export function cronFailureHandler(m: CronMonitor) {
  return async () => {
    await checkIn(m, "error");
  };
}
