import { afterEach, describe, expect, it } from "vitest";
import { captureServerEvent, sanitizeProperties, setPostHogForTests, SERVER_EVENTS } from "@/server/observability/posthog";

afterEach(() => setPostHogForTests(undefined));

describe("server-side PostHog events (docs/02 § 8)", () => {
  it("event names follow the object_action taxonomy", () => {
    for (const name of Object.keys(SERVER_EVENTS)) expect(name).toMatch(/^[a-z0-9]+(_[a-z0-9]+)+$/);
  });

  it("keeps only allowed properties and drops e-mail/free text", () => {
    const props = sanitizeProperties("support_escalated", { reason: "SECURITY", priority: "HIGH", email: "a@b.dk", summary: "lang tekst" });
    expect(props).toEqual({ reason: "SECURITY", priority: "HIGH" });
    expect(sanitizeProperties("checkout_completed", { plan: "x@y.dk", seats: 5 })).toEqual({ seats: 5 });
    expect(sanitizeProperties("support_tool_used", { tool: "a".repeat(200) })).toEqual({});
  });

  it("captures with distinct_id = user id and never throws", async () => {
    const sent: unknown[] = [];
    setPostHogForTests({ captureImmediate: async (m) => void sent.push(m) });
    await captureServerEvent({ distinctId: "user_1", event: "support_tool_used", properties: { tool: "search_help_articles" } });
    expect(sent).toEqual([{ distinctId: "user_1", event: "support_tool_used", properties: { tool: "search_help_articles", $process_person_profile: false } }]);
    setPostHogForTests({ captureImmediate: async () => Promise.reject(new Error("down")) });
    await expect(captureServerEvent({ distinctId: "u", event: "trial_started" })).resolves.toBeUndefined();
  });

  it("is a no-op when PostHog is not configured", async () => {
    setPostHogForTests(null);
    await expect(captureServerEvent({ distinctId: "u", event: "trial_started" })).resolves.toBeUndefined();
  });
});
