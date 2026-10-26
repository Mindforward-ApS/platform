import "server-only";
import { randomUUID } from "node:crypto";
import { makeSignature } from "better-auth/crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ServerEnv } from "@/lib/env.schema";
import { getAuth } from "@/server/auth/better-auth";
import { createPersonalOrg, setActiveOrganization } from "@/server/orgs/service";

// Preview access without email (Marco 26 Oct 2026: "jeg gider ikke at logge ind"). GET /api/dev/adgang signs in ONE
// fixed demo user with a personal account. Two locks: PREVIEW_AUTO_LOGIN must be on (env validation refuses it in
// production) and the route refuses VERCEL_ENV=production itself. Vercel deployment protection sits in front of previews.

export const PREVIEW_DEMO_EMAIL = "demo@preview.mindforward.invalid";
const PREVIEW_DEMO_NAME = "Marco (demo)";

export function previewAccessAllowed(env: Pick<ServerEnv, "PREVIEW_AUTO_LOGIN" | "VERCEL_ENV">): boolean {
  return Boolean(env.PREVIEW_AUTO_LOGIN) && env.VERCEL_ENV !== "production";
}

/** Find or create the demo user and its personal account. Idempotent. */
export async function ensurePreviewDemoUser(db: PrismaClient) {
  const user = await db.user.upsert({
    where: { email: PREVIEW_DEMO_EMAIL },
    create: { id: randomUUID(), email: PREVIEW_DEMO_EMAIL, name: PREVIEW_DEMO_NAME, emailVerified: true },
    update: {},
    select: { id: true, name: true },
  });
  const org = await createPersonalOrg(db, { id: user.id, name: user.name });
  return { userId: user.id, organizationId: org.id };
}

/** A real Better Auth session for the demo user, plus the signed cookie that carries it. */
export async function createPreviewSession(db: PrismaClient) {
  const { userId, organizationId } = await ensurePreviewDemoUser(db);
  const ctx = await getAuth().$context;
  const session = await ctx.internalAdapter.createSession(userId);
  if (!session) throw new Error("preview session could not be created");
  await setActiveOrganization(db, session.id, organizationId);
  const cookie = ctx.authCookies.sessionToken;
  const value = `${session.token}.${await makeSignature(session.token, ctx.secret)}`;
  return { name: cookie.name, value, attributes: cookie.attributes, expiresAt: session.expiresAt };
}
