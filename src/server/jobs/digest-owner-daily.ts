import { serverEnv } from "@/lib/env";
import { db } from "@/server/db";
import { sendOwnerDigest } from "@/server/support/digest";
import { inngest } from "./client";
import { cronFailureHandler, cronTrigger, reportCronOk, type CronMonitor } from "./monitor";

// digest.owner-daily (docs/02 § 5, docs/08 § 7): 07:00 Europe/Copenhagen. Idempotent: the EmailMessage key
// owner-digest:{date} makes a retry or a second tick send nothing new.
export const OWNER_DIGEST_MONITOR: CronMonitor = { slug: "digest-owner-daily", schedule: "0 7 * * *", maxRuntimeMinutes: 10 };

export const ownerDigestJob = inngest.createFunction(
  { id: "digest.owner-daily", retries: 3, triggers: { cron: cronTrigger(OWNER_DIGEST_MONITOR) }, onFailure: cronFailureHandler(OWNER_DIGEST_MONITOR) },
  async ({ step }) => {
    const result = await step.run("send-owner-digest", () => sendOwnerDigest({ db: db(), env: serverEnv() }));
    await reportCronOk(step, OWNER_DIGEST_MONITOR);
    return result;
  },
);
