import { inngest } from "./client";

/** M0 smoke job: proves Inngest can reach /api/inngest and run steps. */
export const helloJob = inngest.createFunction(
  { id: "system.hello", retries: 3, triggers: { event: "system/hello" } },
  async ({ event, step }) => {
    const greeting = await step.run("build-greeting", () => `Hej fra Greb (${String(event.data?.source ?? "ukendt")})`);
    return { greeting };
  },
);
