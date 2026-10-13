import "server-only";
import { BRAND } from "@/lib/i18n/da";
import { createHash } from "node:crypto";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { magicLink, oAuthProxy, organization } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import type { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import type { ServerEnv } from "@/lib/env.schema";
import { writeAudit } from "@/server/audit/log";
import { db } from "@/server/db";
import { sendServiceEmail } from "@/server/email/send";
import { consumeRateLimit, RATE_LIMITS, rateLimitKeys } from "@/server/security/rate-limit";
import { allowedHosts, trustedOrigins } from "./hosts";
import { ac, roles } from "./roles";

// Better Auth configuration (docs/02-arkitektur.md § 3). Organizations are created by our own services
// (src/server/orgs) so `type`/`seatLimit` can never be set by a client; Better Auth handles login,
// sessions, invitations and role changes.

const SEVEN_DAYS = 7 * 24 * 60 * 60;

function originFrom(request: Request | undefined, fallback: string): string {
  try {
    return request ? new URL(request.url).origin : fallback;
  } catch {
    return fallback;
  }
}

function socialProviders(env: ServerEnv): BetterAuthOptions["socialProviders"] {
  return {
    ...(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET
      ? {
          microsoft: {
            clientId: env.MICROSOFT_CLIENT_ID,
            clientSecret: env.MICROSOFT_CLIENT_SECRET,
            tenantId: env.MICROSOFT_TENANT_ID,
            prompt: "select_account" as const,
            ...(env.AUTH_PRODUCTION_URL ? { redirectURI: `${env.AUTH_PRODUCTION_URL}/api/auth/callback/microsoft` } : {}),
          },
        }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account" as const,
            ...(env.AUTH_PRODUCTION_URL ? { redirectURI: `${env.AUTH_PRODUCTION_URL}/api/auth/callback/google` } : {}),
          },
        }
      : {}),
  };
}

export function buildAuthOptions(deps: { db: PrismaClient; env: ServerEnv }) {
  const { env } = deps;
  const prisma = deps.db;

  return {
    appName: BRAND,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: {
      allowedHosts: allowedHosts(env.APP_URL, env.AUTH_PRODUCTION_URL),
      fallback: env.APP_URL,
      protocol: new URL(env.APP_URL).protocol === "http:" ? ("http" as const) : ("https" as const),
    },
    trustedOrigins: trustedOrigins(env.APP_URL, env.AUTH_PRODUCTION_URL),
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    socialProviders: socialProviders(env),
    account: {
      // Microsoft does not always verify email claims (Better Auth docs) → no implicit linking from it.
      accountLinking: { enabled: true, trustedProviders: [] },
    },
    rateLimit: {
      enabled: env.NODE_ENV !== "test",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/magic-link": RATE_LIMITS.magicLinkPerIp,
        "/sign-in/social": { window: 60, max: 20 },
        "/magic-link/verify": { window: 60, max: 20 },
      },
      customStorage: { consume: (key: string, rule: { window: number; max: number }) => consumeRateLimit(prisma, `ba:${key}`, rule) },
    },
    advanced: {
      cookiePrefix: "greb",
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for"] },
    },
    hooks: {
      // Audit role changes with the acting user (the plugin's own hook only knows the member being changed).
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/organization/update-member-role") return;
        const returned: unknown = ctx.context.returned;
        if (!returned || typeof returned !== "object" || returned instanceof APIError || !("id" in returned)) return;
        const member = returned as { id: string; organizationId: string; userId: string; role: string };
        const actor = ctx.context.session ?? (await getSessionFromCtx(ctx));
        await writeAudit(prisma, {
          action: "MEMBER_ROLE_CHANGED",
          actorUserId: actor?.user.id ?? null,
          organizationId: member.organizationId,
          targetType: "membership",
          targetId: member.id,
          metadata: { newRole: member.role, memberUserId: member.userId },
          ip: ctx.request?.headers.get("x-vercel-forwarded-for") ?? ctx.request?.headers.get("x-forwarded-for") ?? null,
        });
      }),
    },
    plugins: [
      magicLink({
        expiresIn: env.MAGIC_LINK_EXPIRES_MIN * 60,
        sendMagicLink: async ({ email, url, token }) => {
          const limited = await consumeRateLimit(prisma, rateLimitKeys.magicLinkEmail(email), RATE_LIMITS.magicLinkPerEmail);
          if (!limited.allowed) throw new APIError("TOO_MANY_REQUESTS", { message: "RATE_LIMITED" });
          await sendServiceEmail(prisma, {
            template: "magic-link",
            to: email,
            vars: { url, expiresMin: env.MAGIC_LINK_EXPIRES_MIN },
            idempotencyKey: `magic-link:${createHash("sha256").update(token).digest("hex").slice(0, 32)}`,
          });
        },
      }),
      organization({
        ac,
        roles,
        creatorRole: "OWNER",
        allowUserToCreateOrganization: false,
        disableOrganizationDeletion: true,
        invitationExpiresIn: SEVEN_DAYS,
        cancelPendingInvitationsOnReInvite: true,
        requireEmailVerificationOnInvitation: true,
        schema: { member: { modelName: "membership" } },
        sendInvitationEmail: async (data, request) => {
          await sendServiceEmail(prisma, {
            template: "invitation",
            to: data.email,
            vars: {
              url: `${originFrom(request, env.APP_URL)}/invitation/${data.id}`,
              organizationName: data.organization.name,
              inviterName: data.inviter.user.name,
            },
            idempotencyKey: `invite:${data.id}`,
            userId: data.inviter.user.id,
            organizationId: data.organization.id,
          });
        },
        organizationHooks: {
          // PERSONAL (B2C) orgs have exactly one seat: nobody can be invited into them.
          beforeCreateInvitation: async ({ organization: org }) => {
            const row = await prisma.organization.findUnique({ where: { id: org.id }, select: { type: true } });
            if (row?.type !== "BUSINESS") throw new APIError("FORBIDDEN", { message: "PERSONAL_ORG" });
          },
          beforeUpdateMemberRole: async ({ member, newRole }) => {
            if (member.role !== "OWNER" || newRole === "OWNER") return;
            const owners = await prisma.membership.count({ where: { organizationId: member.organizationId, role: "OWNER", deactivatedAt: null } });
            if (owners <= 1) throw new APIError("BAD_REQUEST", { message: "LAST_OWNER" });
          },
          afterCreateInvitation: async ({ invitation, inviter }) => {
            await writeAudit(prisma, {
              action: "INVITATION_CREATED",
              actorUserId: inviter.id,
              organizationId: invitation.organizationId,
              targetType: "invitation",
              targetId: invitation.id,
              metadata: { role: invitation.role },
            });
          },
          afterAcceptInvitation: async ({ member, user, organization: org }) => {
            await writeAudit(prisma, {
              action: "MEMBER_JOINED",
              actorUserId: user.id,
              organizationId: org.id,
              targetType: "membership",
              targetId: member.id,
              metadata: { role: member.role },
            });
          },
        },
      }),
      ...(env.AUTH_PRODUCTION_URL
        ? [oAuthProxy({ productionURL: env.AUTH_PRODUCTION_URL, ...(env.OAUTH_PROXY_SECRET ? { secret: env.OAUTH_PROXY_SECRET } : {}) })]
        : []),
      // Must be last: lets server actions set auth cookies.
      nextCookies(),
    ],
  } satisfies BetterAuthOptions;
}

function createAuth() {
  return betterAuth(buildAuthOptions({ db: db(), env: serverEnv() }));
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { auth?: Auth };

export function getAuth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}

