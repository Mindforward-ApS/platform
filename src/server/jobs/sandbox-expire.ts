import { db } from "@/server/db";
import { expireIdleSessions } from "@/server/sandbox/service";
import { inngest } from "./client";

/** docs/02 § 5: closes sandbox sessions without activity for 7 days (Europe/Copenhagen, outside 02–03). */
export const sandboxExpireJob = inngest.createFunction(
  { id: "sandbox.expire-sessions", retries: 3, triggers: { cron: "TZ=Europe/Copenhagen 15 4 * * *" } },
  async ({ step }) => {
    const closed = await step.run("close-idle-sessions", () => expireIdleSessions(db()));
    return { closed };
  },
);
