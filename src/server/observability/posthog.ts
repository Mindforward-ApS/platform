import "server-only";
import { PostHog } from "posthog-node";
import { logger } from "./logger";

// Server-side product events (docs/02 § 8) via posthog-node to PostHog EU Cloud. distinct_id = internal user.id.
// NEVER email, names or prompt text in properties: only the taxonomy's allowed keys with short scalar values.
// Disabled (no-op) unless POSTHOG_API_KEY is set. Uses captureImmediate (serverless: no background flush).

export const SERVER_EVENTS = {
  signup_completed: ["method", "orgType"],
  placement_completed: ["track", "level", "durationS"],
  plan_generated: ["moduleCount"],
  placement_claimed: [],
  module_started: ["moduleSlug", "type", "track"],
  module_passed: ["scorePct", "attemptNo"],
  module_failed: ["scorePct", "mustPassFailed"],
  certificate_issued: ["track", "level"],
  reminder_sent: ["day"],
  checkout_completed: ["plan", "seats"],
  trial_started: [],
  withdrawal_submitted: [],
  subscription_canceled: ["reason"],
  org_created: [],
  invite_sent: ["method"],
  invite_accepted: [],
  consent_given: ["purpose", "source"],
  consent_confirmed: [],
  consent_withdrawn: ["source"],
  support_conversation_started: [],
  support_tool_used: ["tool"],
  support_escalated: ["reason", "priority"],
  ai_budget_threshold: ["scope", "pct"],
  content_module_published: ["origin"],
} as const satisfies Record<string, readonly string[]>;

export type ServerEvent = keyof typeof SERVER_EVENTS;
type Scalar = string | number | boolean;

export interface CaptureInput<E extends ServerEvent = ServerEvent> {
  distinctId: string;
  event: E;
  properties?: Partial<Record<(typeof SERVER_EVENTS)[E][number], Scalar>>;
}

export interface PostHogLike {
  captureImmediate(msg: { distinctId: string; event: string; properties?: Record<string, unknown> }): Promise<void>;
}

/** Keeps only the event's allowed keys; drops values that look like PII (e-mail, long free text). */
export function sanitizeProperties(event: ServerEvent, props: Record<string, unknown> = {}): Record<string, Scalar> {
  const allowed = new Set<string>(SERVER_EVENTS[event]);
  const out: Record<string, Scalar> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!allowed.has(k)) continue;
    if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && v.length <= 64 && !v.includes("@") && !/\s{2,}|\n/.test(v)) out[k] = v;
  }
  return out;
}

let client: PostHogLike | null | undefined;

export function setPostHogForTests(c: PostHogLike | null | undefined): void {
  client = c;
}

async function getClient(): Promise<PostHogLike | null> {
  if (client !== undefined) return client;
  const { serverEnv } = await import("@/lib/env");
  const env = serverEnv();
  client = env.POSTHOG_API_KEY ? new PostHog(env.POSTHOG_API_KEY, { host: env.POSTHOG_HOST, flushAt: 1, flushInterval: 0, disableGeoip: true }) : null;
  return client;
}

/** Fire-and-forget safe: never throws (analytics must not break a request). */
export async function captureServerEvent<E extends ServerEvent>(input: CaptureInput<E>): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    await c.captureImmediate({ distinctId: input.distinctId, event: input.event, properties: { ...sanitizeProperties(input.event, input.properties), $process_person_profile: false } });
  } catch (err) {
    logger.warn("posthog.capture_failed", { event: input.event, err });
  }
}
