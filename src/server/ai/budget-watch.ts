import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ServerEnv } from "@/lib/env.schema";
import { writeAudit } from "@/server/audit/log";
import { formatDkk } from "@/server/billing/vat";
import { sendServiceEmail } from "@/server/email/send";
import { logger } from "@/server/observability/logger";
import { captureServerEvent } from "@/server/observability/posthog";
import { DEGRADED_PCT, globalBudgetState, type GlobalBudgetState } from "./budget";

// ai.budget-watch (docs/02 § 5–6, cron "5 * * * *"): the global monthly AI budget.
//  ≥ AI_BUDGET_ALERT_PCT (80 %) → ONE alert per month: compare-and-set on BudgetMonth.alert80SentAt (only the run
//    that flips NULL → now sends), mail to OWNER_DIGEST_EMAIL + Sentry message + PostHog ai_budget_threshold.
//  ≥ 95 % → degraded mode: FeatureFlag AI_DEGRADED_MODE (source budget-watch) + BudgetMonth.degradedAt (CAS).
//  ≥ 100 % → second alert (CAS on alert100SentAt). Blocking itself happens in the gateway on every call.
// A new month starts below the thresholds: a degraded flag set by this job for an earlier month is switched off.

export const DEGRADED_FLAG = "AI_DEGRADED_MODE";

export interface BudgetWatchDeps {
  db: PrismaClient;
  env: Pick<ServerEnv, "AI_GLOBAL_MONTHLY_BUDGET_DKK" | "AI_BUDGET_ALERT_PCT" | "OWNER_DIGEST_EMAIL" | "APP_URL">;
  sendMail?: typeof sendServiceEmail;
  /** Sentry hook (job passes Sentry.captureMessage); tests record calls. */
  notify?: (message: string, level: "warning" | "error") => void;
  now?: () => Date;
}

export interface BudgetWatchResult {
  state: GlobalBudgetState;
  alert80Sent: boolean;
  alert100Sent: boolean;
  degradedSwitchedOn: boolean;
  degradedSwitchedOff: boolean;
}

async function casTimestamp(db: PrismaClient, month: string, field: "alert80SentAt" | "alert100SentAt" | "degradedAt", now: Date): Promise<boolean> {
  const { count } = await db.budgetMonth.updateMany({ where: { scope: "GLOBAL_AI", month, [field]: null }, data: { [field]: now } });
  return count === 1;
}

function flagSource(value: unknown): { source?: string; month?: string } {
  return value && typeof value === "object" ? (value as { source?: string; month?: string }) : {};
}

export async function runBudgetWatch(deps: BudgetWatchDeps): Promise<BudgetWatchResult> {
  const { db, env } = deps;
  const now = deps.now ? deps.now() : new Date();
  const send = deps.sendMail ?? sendServiceEmail;
  const alertPct = env.AI_BUDGET_ALERT_PCT;
  const state = await globalBudgetState(db, env.AI_GLOBAL_MONTHLY_BUDGET_DKK, now, alertPct);
  // The row must exist for the compare-and-set (a quiet month may not have any AI call yet).
  await db.budgetMonth.upsert({
    where: { scope_month: { scope: "GLOBAL_AI", month: state.month } },
    create: { scope: "GLOBAL_AI", month: state.month, limitDkk: env.AI_GLOBAL_MONTHLY_BUDGET_DKK, spentDkk: 0 },
    update: {},
  });
  const result: BudgetWatchResult = { state, alert80Sent: false, alert100Sent: false, degradedSwitchedOn: false, degradedSwitchedOff: false };
  const pctRounded = Math.floor(state.pct * 100);

  const alert = async (kind: "80" | "100") => {
    const level = kind === "100" ? "BLOCKED" : state.pct >= DEGRADED_PCT ? "DEGRADED" : "ALERT";
    deps.notify?.(`AI budget ${state.month}: ${pctRounded} pct. of ${env.AI_GLOBAL_MONTHLY_BUDGET_DKK} DKK`, kind === "100" ? "error" : "warning");
    void captureServerEvent({ distinctId: "system", event: "ai_budget_threshold", properties: { scope: "GLOBAL_AI", pct: kind === "100" ? 100 : Math.round(alertPct * 100) } });
    if (!env.OWNER_DIGEST_EMAIL) {
      logger.warn("ai.budget_alert_no_recipient", { month: state.month, kind });
      return;
    }
    try {
      await send(db, {
        template: "ai-budget-alert",
        to: env.OWNER_DIGEST_EMAIL,
        vars: { url: `${env.APP_URL}/admin/forbrug`, month: state.month, pct: pctRounded, spent: formatDkk(Math.round(state.spentDkk * 100)), limit: formatDkk(Math.round(state.limitDkk * 100)), level },
        idempotencyKey: `ai-budget-alert-${kind}:${state.month}`,
      });
    } catch (err) {
      // The CAS already recorded the alert; Sentry (notify) has it too. Do not resend on retry.
      logger.error("ai.budget_alert_mail_failed", { month: state.month, kind, err });
    }
  };

  if (state.pct >= alertPct && (await casTimestamp(db, state.month, "alert80SentAt", now))) {
    result.alert80Sent = true;
    await alert("80");
  }
  if (state.pct >= 1 && (await casTimestamp(db, state.month, "alert100SentAt", now))) {
    result.alert100Sent = true;
    await alert("100");
  }

  const flag = await db.featureFlag.findUnique({ where: { key: DEGRADED_FLAG } });
  if (state.pct >= DEGRADED_PCT) {
    await casTimestamp(db, state.month, "degradedAt", now);
    if (!flag?.enabled) {
      await db.featureFlag.upsert({
        where: { key: DEGRADED_FLAG },
        create: { key: DEGRADED_FLAG, enabled: true, value: { source: "budget-watch", month: state.month } },
        update: { enabled: true, value: { source: "budget-watch", month: state.month } },
      });
      await writeAudit(db, { action: "AI_BUDGET_MODE_CHANGED", actorType: "SYSTEM", targetType: "feature_flag", targetId: DEGRADED_FLAG, metadata: { enabled: true, month: state.month, pct: pctRounded } });
      result.degradedSwitchedOn = true;
    }
  } else if (flag?.enabled && flagSource(flag.value).source === "budget-watch") {
    // Only undo what this job switched on (a manual kill-switch by Marco stays).
    await db.featureFlag.update({ where: { key: DEGRADED_FLAG }, data: { enabled: false, value: { source: "budget-watch", month: state.month } } });
    await writeAudit(db, { action: "AI_BUDGET_MODE_CHANGED", actorType: "SYSTEM", targetType: "feature_flag", targetId: DEGRADED_FLAG, metadata: { enabled: false, month: state.month, pct: pctRounded } });
    result.degradedSwitchedOff = true;
  }
  logger.info("ai.budget_watch", { month: state.month, pct: pctRounded, level: state.level, ...result, state: undefined });
  return result;
}
