import "server-only";
import { randomUUID } from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import type { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { writeAudit } from "@/server/audit/log";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { decryptSecret, encryptSecret } from "./secret-box";

// TOTP step-up for GREB_ADMIN only (docs/OPEN-QUESTIONS.md M1). Greb has no passwords, so Better Auth's
// twoFactor plugin (password-gated) is not used; the `two_factor` table and `session.twoFactorVerifiedAt` are.

const ATTEMPTS = { window: 15 * 60, max: 5 };
const ISSUER = "Greb";

async function codeMatches(sealedSecret: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = decryptSecret(sealedSecret, serverEnv().BETTER_AUTH_SECRET);
  const result = await verify({ secret, token: code, epochTolerance: 30 });
  return result.valid;
}

async function underAttemptLimit(db: PrismaClient, userId: string): Promise<boolean> {
  return (await consumeRateLimit(db, `totp:${userId}`, ATTEMPTS)).allowed;
}

/** Creates (or replaces) a pending, not-yet-enabled TOTP secret. Returns the plain secret once, for the QR/manual entry. */
export async function startEnrollment(db: PrismaClient, user: { id: string; email: string }) {
  const secret = generateSecret();
  const sealed = encryptSecret(secret, serverEnv().BETTER_AUTH_SECRET);
  await db.$transaction([
    db.twoFactor.deleteMany({ where: { userId: user.id } }),
    db.twoFactor.create({ data: { id: randomUUID(), userId: user.id, secret: sealed, backupCodes: "[]" } }),
    db.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false } }),
  ]);
  return { secret, otpauthUri: generateURI({ issuer: ISSUER, label: user.email, secret }) };
}

export async function confirmEnrollment(db: PrismaClient, args: { userId: string; sessionId: string; code: string }): Promise<boolean> {
  const row = await db.twoFactor.findFirst({ where: { userId: args.userId } });
  if (!row || !(await underAttemptLimit(db, args.userId)) || !(await codeMatches(row.secret, args.code))) return false;
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: args.userId }, data: { twoFactorEnabled: true } });
    await tx.session.update({ where: { id: args.sessionId }, data: { twoFactorVerifiedAt: new Date() } });
    await writeAudit(tx, { action: "TWO_FACTOR_ENROLLED", actorUserId: args.userId, targetType: "user", targetId: args.userId });
  });
  return true;
}

export async function verifySessionCode(db: PrismaClient, args: { userId: string; sessionId: string; code: string }): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: args.userId }, select: { platformRole: true, twoFactorEnabled: true } });
  if (user?.platformRole !== "GREB_ADMIN" || !user.twoFactorEnabled) return false;
  const row = await db.twoFactor.findFirst({ where: { userId: args.userId } });
  if (!row || !(await underAttemptLimit(db, args.userId)) || !(await codeMatches(row.secret, args.code))) return false;
  await db.session.update({ where: { id: args.sessionId }, data: { twoFactorVerifiedAt: new Date() } });
  return true;
}
