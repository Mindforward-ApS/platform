import { randomUUID } from "node:crypto";
import type { EmailMessage, MembershipRole, OrganizationType } from "@/generated/prisma/client";
import { createGateway, type GatewayEnv } from "@/server/ai/gateway";
import type { ModelProvider, ProviderBlock, ProviderRequest, ProviderResponse } from "@/server/ai/client";
import type { BillingDeps } from "@/server/billing/deps";
import type { StripeGateway } from "@/server/billing/stripe";
import type { AgentDeps, AgentIdentity } from "@/server/support/agent";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

// Fixture accounts (docs/08 § 9 "account:") + a scripted model provider + recording mail/Stripe stubs.
// No network: the model is scripted, Stripe is a stub, mail is recorded.

export const gatewayEnv: GatewayEnv = {
  AI_ENABLED: true,
  AI_MOCK: true,
  ANTHROPIC_API_KEY: undefined,
  AI_MODEL_DEFAULT: "claude-haiku-4-5",
  AI_MODEL_FALLBACK: undefined,
  AI_MODEL_GRADER: undefined,
  SUPPORT_MODEL: undefined,
  AI_TIMEOUT_MS: 5000,
  AI_USER_DAILY_TOKEN_CAP: 1_000_000,
  AI_GLOBAL_MONTHLY_BUDGET_DKK: 1_000_000_000,
  AI_USD_DKK_RATE: 6.9,
};

export type FixtureKey = "b2c_active_day3" | "b2c_active_day40" | "b2c_free" | "b2b_owner" | "b2b_admin" | "b2b_learner";

export interface Fixture {
  identity: AgentIdentity;
  orgId: string;
  userId: string;
  subscriptionId: string | null;
  billingEmail: string | null;
}

const DAY = 24 * 60 * 60 * 1000;

export async function makeFixture(key: FixtureKey, now = new Date()): Promise<Fixture> {
  const db = testDb();
  const b2b = key.startsWith("b2b");
  const orgType: OrganizationType = b2b ? "BUSINESS" : "PERSONAL";
  const role: MembershipRole = key === "b2b_admin" ? "ADMIN" : key === "b2b_learner" ? "LEARNER" : "OWNER";
  const user = await makeUser();
  const org = await makeOrg(orgType);
  await addMember(org.id, user.id, role);
  const billingEmail = b2b ? `faktura-${org.id.slice(0, 6)}@firma.example.test` : null;
  await db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: key === "b2c_free" ? null : `cus_${org.id}`, billingEmail } });
  if (b2b && role !== "OWNER") {
    const owner = await makeUser();
    await addMember(org.id, owner.id, "OWNER");
  }
  let subscriptionId: string | null = null;
  if (key !== "b2c_free") {
    const purchased = new Date(now.getTime() - (key === "b2c_active_day40" ? 40 : 3) * DAY);
    const sub = await db.subscription.create({
      data: {
        organizationId: org.id,
        planKey: b2b ? "B2B_MONTHLY" : "B2C_MONTHLY",
        stripeSubscriptionId: `sub_${org.id}`,
        stripeCustomerId: `cus_${org.id}`,
        stripePriceId: "price_test",
        status: "ACTIVE",
        quantity: b2b ? 5 : 1,
        currentPeriodStart: purchased,
        currentPeriodEnd: new Date(purchased.getTime() + 30 * DAY),
        lastStripeEventAt: purchased,
        lastStripeEventId: `evt_${org.id}`,
        withdrawalDeadlineAt: b2b ? null : new Date(purchased.getTime() + 14 * DAY),
      },
    });
    subscriptionId = sub.id;
  }
  return {
    identity: { userId: user.id, organizationId: org.id, role, orgType, userName: "Mette Testesen", userEmail: user.email },
    orgId: org.id,
    userId: user.id,
    subscriptionId,
    billingEmail,
  };
}

/** A module the user has an assignment + completed attempt on (for reset_module_progress). */
export async function makeModuleProgress(userId: string, organizationId: string) {
  const db = testDb();
  const id = randomUUID().slice(0, 8);
  const mod = await db.module.create({ data: { slug: `test-mod-${id}`, type: "CORE" } });
  const version = await db.moduleVersion.create({
    data: { moduleId: mod.id, version: 1, status: "IN_REVIEW", schemaVersion: "1", title: `Testmodul ${id}`, content: {}, maxPoints: 10, estimatedMinutes: 5, searchText: "", contentHash: id },
  });
  // IN_REVIEW (not PUBLISHED): tests/integration/seed.test.ts asserts no unapproved module is ever published.
  const assignment = await db.assignment.create({ data: { organizationId, userId, moduleId: mod.id, source: "SELF", status: "PASSED", bestScorePct: 90, passedAt: new Date() } });
  const attempt = await db.attempt.create({ data: { organizationId, userId, moduleVersionId: version.id, assignmentId: assignment.id, status: "COMPLETED", maxPoints: 10, points: 9, scorePct: 90, passed: true, completedAt: new Date() } });
  await db.assignment.update({ where: { id: assignment.id }, data: { bestAttemptId: attempt.id } });
  return { moduleId: mod.id, title: version.title, assignmentId: assignment.id, attemptId: attempt.id };
}

// ── scripted model ─────────────────────────────────────────────────────────

export type ModelStep = { tool: string; input: unknown } | { text: string } | ((req: ProviderRequest) => ProviderResponse);

const usage = { inputTokens: 50, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function scriptedModel(steps: ModelStep[]) {
  const requests: ProviderRequest[] = [];
  const provider: ModelProvider = {
    name: "test",
    async send(req, { onText }) {
      requests.push(req);
      const step = steps[requests.length - 1] ?? { text: "Okay." };
      let resp: ProviderResponse;
      if (typeof step === "function") resp = step(req);
      else if ("tool" in step) resp = { content: [{ type: "tool_use", id: `toolu_${requests.length}`, name: step.tool, input: step.input }], stopReason: "tool_use", usage };
      else resp = { content: [{ type: "text", text: step.text }], stopReason: "end_turn", usage };
      for (const b of resp.content as ProviderBlock[]) if (b.type === "text") onText?.(b.text);
      return resp;
    },
  };
  return { provider, requests };
}

/** All text the model saw (system + messages + tool results) — used to prove PII never reached it. */
export function seenText(requests: ProviderRequest[]): string {
  return JSON.stringify(requests.map((r) => [r.system, r.messages]));
}

// ── stubs ──────────────────────────────────────────────────────────────────

export interface SentMail {
  template: string;
  to: string;
}

export function mailRecorder() {
  const sent: SentMail[] = [];
  const sendMail = (async (_db: unknown, args: { template: string; to: string }) => {
    sent.push({ template: args.template, to: args.to });
    return { id: randomUUID() } as EmailMessage;
  }) as unknown as AgentDeps["sendMail"];
  return { sent, sendMail };
}

export function stripeStub(): StripeGateway {
  return {
    subscriptions: {
      async retrieve(id: string) {
        return { id, latest_invoice: `in_${id}` };
      },
    },
    invoices: {
      async retrieve(id: string) {
        return { id, number: `GREB-${id.slice(-4)}`, status: "paid", amount_paid: 30625, hosted_invoice_url: `https://invoice.stripe.example.test/${id}` };
      },
    },
    billingPortal: {
      sessions: {
        async create(params: { return_url?: string }) {
          return { url: `https://billing.stripe.example.test/session?return=${encodeURIComponent(params.return_url ?? "")}` };
        },
      },
    },
  } as unknown as StripeGateway;
}

export function agentDeps(provider: ModelProvider, opts: { sendMail?: AgentDeps["sendMail"]; budgetDkk?: number; now?: () => Date } = {}): AgentDeps {
  const db = testDb();
  const env = { APP_URL: "http://localhost:3000", SUPPORT_INBOX: "support@example.test" };
  const billing = (): BillingDeps => ({ db, stripe: stripeStub(), env: { ...env, STRIPE_PORTAL_CONFIGURATION_ID: undefined } as unknown as BillingDeps["env"] });
  return {
    db,
    env,
    billing,
    sendMail: opts.sendMail,
    now: opts.now,
    modelId: gatewayEnv.AI_MODEL_DEFAULT,
    gateway: createGateway({ db, env: { ...gatewayEnv, AI_GLOBAL_MONTHLY_BUDGET_DKK: opts.budgetDkk ?? gatewayEnv.AI_GLOBAL_MONTHLY_BUDGET_DKK }, provider, sleep: async () => {}, now: opts.now }),
  };
}
