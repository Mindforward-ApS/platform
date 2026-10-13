import { db } from "@/server/db";
import { expireUnconfirmedConsents } from "@/server/email/consent";
import { logger } from "@/server/observability/logger";
import { inngest } from "./client";

/** docs/02 § 5: delete unconfirmed marketing GRANTED rows older than 30 days (daily 04:00 Copenhagen). */
export const consentExpireUnconfirmedJob = inngest.createFunction(
  { id: "consent.expire-unconfirmed", retries: 3, triggers: [{ cron: "TZ=Europe/Copenhagen 0 4 * * *" }] },
  async ({ step }) => {
    const deleted = await step.run("delete-unconfirmed", () => expireUnconfirmedConsents(db()));
    logger.info("consent.expired_unconfirmed", { deleted });
    return { deleted };
  },
);
