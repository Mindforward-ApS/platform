import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { getEntitlements } from "@/server/billing/entitlements";
import { consumeRateLimit } from "@/server/security/rate-limit";
import type { ConnectorPlatformKey } from "./scoring";
import type { ConnectorTestRunner } from "./test-runner";

// "Prøv den" (level 1): runs a ConnectorDemo on fictional data. Every check happens before the stream opens:
// paid plan or trial → rate limit (10/hour per user) → prompt length → (gateway: budget, PII gate, token ceiling).

export const DEMO_RATE_LIMIT = { window: 60 * 60, max: 10 } as const;
export const DEMO_PROMPT_MAX = 2000;

export class DemoError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "NOT_ENTITLED" | "RATE_LIMITED" | "PROMPT_TOO_LONG",
    readonly status: number,
    readonly retryAfter: number | null = null,
  ) {
    super(code);
  }
}

/** Paid plans and active trials only (Marco 15 Oct 2026). */
export async function canRunDemo(db: PrismaClient, organizationId: string): Promise<boolean> {
  const e = await getEntitlements(db, organizationId);
  return e.modules === "FULL" && !e.readOnly;
}

export async function prepareDemoRun(
  db: PrismaClient,
  runner: ConnectorTestRunner,
  scope: { userId: string; organizationId: string },
  input: { demoId: string; prompt: string; platform: ConnectorPlatformKey },
) {
  const demo = await db.connectorDemo.findUnique({ where: { id: input.demoId }, select: { id: true, connectorId: true, prompt: true, data: true, connector: { select: { name: true } } } });
  if (!demo) throw new DemoError("NOT_FOUND", 404);
  const log = (status: string) =>
    db.connectorDemoRun.create({ data: { demoId: demo.id, connectorId: demo.connectorId, ...scope, platform: input.platform, promptEdited: input.prompt.trim() !== demo.prompt.trim(), status } });

  if (!(await canRunDemo(db, scope.organizationId))) {
    await log("BLOCKED_NOT_ENTITLED");
    throw new DemoError("NOT_ENTITLED", 403);
  }
  const rl = await consumeRateLimit(db, `connector-demo:user:${scope.userId}`, DEMO_RATE_LIMIT);
  if (!rl.allowed) {
    await log("BLOCKED_RATE_LIMIT");
    throw new DemoError("RATE_LIMITED", 429, rl.retryAfter);
  }
  const prompt = input.prompt.trim();
  if (!prompt || prompt.length > DEMO_PROMPT_MAX) throw new DemoError("PROMPT_TOO_LONG", 400);

  const prepared = await runner.prepare({ ...scope, platform: input.platform, connectorName: demo.connector.name, data: demo.data, prompt });
  return {
    demo,
    async run(handlers: { onText?: (delta: string) => void }) {
      try {
        const r = await prepared.run(handlers);
        await log("OK");
        return r;
      } catch (err) {
        await log("ERROR");
        throw err;
      }
    },
  };
}
