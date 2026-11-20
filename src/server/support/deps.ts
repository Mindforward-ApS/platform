import "server-only";
import { serverEnv } from "@/lib/env";
import { gateway } from "@/server/ai/gateway";
import { modelConfig } from "@/server/ai/models";
import { billingDeps } from "@/server/billing/deps";
import { db } from "@/server/db";
import type { AgentDeps, AgentIdentity } from "./agent";

// Composition root for the support agent (route handler). Tests build AgentDeps themselves.
export async function supportDeps(): Promise<AgentDeps> {
  const env = serverEnv();
  return {
    db: db(),
    env,
    billing: billingDeps,
    gateway: await gateway(),
    modelId: modelConfig("SUPPORT_AGENT", env).model,
  };
}

/** Identity for the support agent from the session's active membership (null = no active organization). */
export async function supportIdentity(user: { id: string; email: string; name: string }, activeOrganizationId: string | null): Promise<AgentIdentity | null> {
  if (!activeOrganizationId) return null;
  const membership = await db().membership.findFirst({
    where: { userId: user.id, organizationId: activeOrganizationId, deactivatedAt: null, organization: { deletedAt: null } },
    select: { role: true, organization: { select: { type: true } } },
  });
  if (!membership) return null;
  return { userId: user.id, organizationId: activeOrganizationId, role: membership.role, orgType: membership.organization.type, userName: user.name, userEmail: user.email };
}
