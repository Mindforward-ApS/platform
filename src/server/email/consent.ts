import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ConsentAction, ConsentRecord, ConsentSource, Prisma, PrismaClient } from "@/generated/prisma/client";
import { consentConfig } from "@/lib/config/placement";
import { serverEnv } from "@/lib/env";
import { EnvValidationError } from "@/lib/env.schema";
import { MARKETING_CONSENT } from "@/lib/legal/marketing-consent";
import { logger } from "@/server/observability/logger";

// Marketing consent (docs/09 § 2, docs/03 § 8, MFL § 10): append-only ConsentRecord rows; the LATEST row per
// (subjectEmail, MARKETING_EMAIL, EMAIL) decides. GRANTED (checkbox) → CONFIRMED (double opt-in click) → WITHDRAWN.
// Only CONFIRMED + no EmailSuppression lets marketing out (canSendMarketing — checked at send time).

type Db = PrismaClient | Prisma.TransactionClient;

const PURPOSE = "MARKETING_EMAIL" as const;
const CHANNEL = "EMAIL" as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** sha256 of the exact text shown next to the checkbox (stored as ConsentRecord.textHash). */
export function consentTextHash(text: string = MARKETING_CONSENT.text): string {
  return sha256(text);
}

/** EmailSuppression.emailHash = sha256(normalized email + EMAIL_HASH_PEPPER). */
export function emailHash(email: string, pepper: string): string {
  return sha256(`${normalizeEmail(email)}${pepper}`);
}

function requireSecret(name: "UNSUBSCRIBE_TOKEN_SECRET" | "EMAIL_HASH_PEPPER", explicit: string | undefined, purpose: string): string {
  const value = explicit ?? serverEnv()[name];
  if (!value) throw new EnvValidationError([name], `  - ${name}: påkrævet for ${purpose} (se .env.example)`);
  return value;
}

// ─── Gate ──────────────────────────────────────────────────────────────

export type GateDecision =
  | { allowed: true; consentRecordId: string }
  | { allowed: false; reason: "NO_CONSENT" | "NOT_CONFIRMED" | "WITHDRAWN" | "SUPPRESSED" };

/** Pure decision. On a timestamp tie the most restrictive action wins (WITHDRAWN > GRANTED > CONFIRMED). */
export function decideMarketing(records: Pick<ConsentRecord, "id" | "action" | "createdAt">[], suppressed: boolean): GateDecision {
  if (suppressed) return { allowed: false, reason: "SUPPRESSED" };
  if (records.length === 0) return { allowed: false, reason: "NO_CONSENT" };
  const newest = Math.max(...records.map((r) => r.createdAt.getTime()));
  const latest = records.filter((r) => r.createdAt.getTime() === newest);
  const pick = (a: ConsentAction) => latest.find((r) => r.action === a);
  if (pick("WITHDRAWN")) return { allowed: false, reason: "WITHDRAWN" };
  if (pick("GRANTED")) return { allowed: false, reason: "NOT_CONFIRMED" };
  const confirmed = pick("CONFIRMED");
  return confirmed ? { allowed: true, consentRecordId: confirmed.id } : { allowed: false, reason: "NO_CONSENT" };
}

async function latestRecords(db: Db, email: string) {
  return db.consentRecord.findMany({
    where: { subjectEmail: normalizeEmail(email), purpose: PURPOSE, channel: CHANNEL },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, action: true, createdAt: true },
  });
}

export async function isSuppressed(db: Db, email: string, opts: { pepper?: string } = {}): Promise<boolean> {
  const pepper = requireSecret("EMAIL_HASH_PEPPER", opts.pepper, "suppression-listen");
  return (await db.emailSuppression.count({ where: { emailHash: emailHash(email, pepper) } })) > 0;
}

/** THE marketing gate. Fails closed: missing EMAIL_HASH_PEPPER throws instead of skipping the suppression check. */
export async function canSendMarketing(db: Db, email: string, opts: { pepper?: string } = {}): Promise<GateDecision> {
  const [records, suppressed] = await Promise.all([latestRecords(db, email), isSuppressed(db, email, opts)]);
  return decideMarketing(records, suppressed);
}

// ─── Grant (checkbox) ──────────────────────────────────────────────────

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

export interface GrantInput extends RequestMeta {
  email: string;
  source: ConsentSource;
  userId?: string | null;
  organizationId?: string | null;
}

export type GrantResult = { status: "GRANTED"; grantId: string; token: string } | { status: "ALREADY_CONFIRMED" };

/**
 * Records a ticked checkbox (GRANTED, not yet valid) with every field docs/03 § 8 requires and returns the
 * raw confirmation token for the opt-in mail (only its hash is stored). An address that is already CONFIRMED
 * gets no new row — a new GRANTED would otherwise make the latest row unconfirmed and switch consent off.
 */
export async function grantMarketingConsent(db: Db, input: GrantInput, now: Date = new Date()): Promise<GrantResult> {
  const email = normalizeEmail(input.email);
  const current = decideMarketing(await latestRecords(db, email), false);
  if (current.allowed) return { status: "ALREADY_CONFIRMED" };

  const token = randomBytes(32).toString("base64url");
  const grant = await db.consentRecord.create({
    data: {
      subjectEmail: email,
      userId: input.userId ?? null,
      organizationId: input.organizationId ?? null,
      purpose: PURPOSE,
      channel: CHANNEL,
      action: "GRANTED",
      textVersion: MARKETING_CONSENT.version,
      textHash: consentTextHash(),
      source: input.source,
      ip: input.ip,
      userAgent: input.userAgent?.slice(0, 500) ?? null,
      confirmationTokenHash: sha256(token),
      confirmationSentAt: now,
      createdAt: now,
    },
    select: { id: true },
  });
  return { status: "GRANTED", grantId: grant.id, token };
}

// ─── Confirm (double opt-in click) ─────────────────────────────────────

export type ConfirmState = "VALID" | "CONFIRMED" | "EXPIRED" | "WITHDRAWN" | "INVALID";

async function grantByToken(db: Db, token: string) {
  if (!token || token.length > 200) return null;
  return db.consentRecord.findUnique({ where: { confirmationTokenHash: sha256(token) } });
}

async function withdrawnAfter(db: Db, grant: ConsentRecord): Promise<boolean> {
  const count = await db.consentRecord.count({
    where: { subjectEmail: grant.subjectEmail, purpose: PURPOSE, channel: CHANNEL, action: "WITHDRAWN", createdAt: { gte: grant.createdAt } },
  });
  return count > 0;
}

/** Read-only state for the confirmation page (GET must not change anything — mail scanners prefetch links). */
export async function confirmationState(db: Db, token: string, now: Date = new Date()): Promise<ConfirmState> {
  const grant = await grantByToken(db, token);
  if (!grant || grant.action !== "GRANTED" || grant.purpose !== PURPOSE) return "INVALID";
  if (grant.confirmedAt) return "CONFIRMED";
  const sentAt = (grant.confirmationSentAt ?? grant.createdAt).getTime();
  if (now.getTime() - sentAt > consentConfig.confirmationValidDays * DAY_MS) return "EXPIRED";
  if (await withdrawnAfter(db, grant)) return "WITHDRAWN";
  return "VALID";
}

/**
 * The click in the opt-in mail: appends CONFIRMED (grantId → GRANTED) and sets the denormalized confirmedAt.
 * Idempotent for double clicks. Consent becomes valid only here.
 */
export async function confirmMarketingConsent(db: PrismaClient, token: string, meta: RequestMeta, opts: { now?: Date; pepper?: string } = {}): Promise<ConfirmState> {
  const now = opts.now ?? new Date();
  const state = await confirmationState(db, token, now);
  if (state !== "VALID") return state;
  const grant = await grantByToken(db, token);
  if (!grant) return "INVALID";

  const confirmed = await db.$transaction(async (tx) => {
    const claimed = await tx.consentRecord.updateMany({ where: { id: grant.id, confirmedAt: null }, data: { confirmedAt: now } });
    if (claimed.count === 0) return false;
    await tx.consentRecord.create({
      data: {
        subjectEmail: grant.subjectEmail,
        userId: grant.userId,
        organizationId: grant.organizationId,
        purpose: PURPOSE,
        channel: CHANNEL,
        action: "CONFIRMED",
        grantId: grant.id,
        textVersion: grant.textVersion,
        textHash: grant.textHash,
        source: "CONFIRMATION_LINK",
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 500) ?? null,
        createdAt: now,
      },
    });
    return true;
  });
  if (!confirmed) return "CONFIRMED";

  // A fresh, confirmed consent lifts an earlier self-unsubscribe (never a bounce or complaint).
  const pepper = opts.pepper ?? serverEnv().EMAIL_HASH_PEPPER;
  if (pepper) await db.emailSuppression.deleteMany({ where: { emailHash: emailHash(grant.subjectEmail, pepper), reason: "UNSUBSCRIBED" } });
  else logger.warn("consent.confirm_without_pepper", { note: "UNSUBSCRIBED suppression (if any) kept; gate stays closed" });
  return "CONFIRMED";
}

// ─── Withdraw (unsubscribe) ────────────────────────────────────────────

/**
 * Appends WITHDRAWN (blocks the gate immediately) and adds the address to the suppression list.
 * The WITHDRAWN row is written even if EMAIL_HASH_PEPPER is missing; the gate then fails closed anyway.
 */
export async function withdrawMarketingConsent(
  db: PrismaClient,
  input: RequestMeta & { email: string; source: ConsentSource; userId?: string | null },
  opts: { now?: Date; pepper?: string } = {},
): Promise<void> {
  const email = normalizeEmail(input.email);
  const now = opts.now ?? new Date();
  const pepper = opts.pepper ?? serverEnv().EMAIL_HASH_PEPPER;

  await db.$transaction(async (tx) => {
    const grant = await tx.consentRecord.findFirst({
      where: { subjectEmail: email, purpose: PURPOSE, channel: CHANNEL, action: "GRANTED" },
      orderBy: { createdAt: "desc" },
    });
    await tx.consentRecord.create({
      data: {
        subjectEmail: email,
        userId: input.userId ?? grant?.userId ?? null,
        organizationId: grant?.organizationId ?? null,
        purpose: PURPOSE,
        channel: CHANNEL,
        action: "WITHDRAWN",
        grantId: grant?.id ?? null,
        textVersion: grant?.textVersion ?? MARKETING_CONSENT.version,
        textHash: grant?.textHash ?? consentTextHash(),
        source: input.source,
        ip: input.ip,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        createdAt: now,
      },
    });
    if (grant && !grant.withdrawnAt) await tx.consentRecord.update({ where: { id: grant.id }, data: { withdrawnAt: now } });
    if (pepper) {
      await tx.emailSuppression.upsert({
        where: { emailHash: emailHash(email, pepper) },
        create: { emailHash: emailHash(email, pepper), reason: "UNSUBSCRIBED" },
        update: {},
      });
    }
  });
  if (!pepper) logger.error("consent.withdraw_without_pepper", { note: "WITHDRAWN recorded; suppression row not written" });
}

// ─── Unsubscribe tokens (/afmeld?t=…) ──────────────────────────────────

const TOKEN_VERSION = "v1";

function unsubscribeSignature(email: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`unsubscribe:${TOKEN_VERSION}:${email}`).digest();
}

/** `v1.<base64url(email)>.<base64url(hmac)>` — no login, no expiry (an unsubscribe link must keep working). */
export function signUnsubscribeToken(email: string, secret: string): string {
  const normalized = normalizeEmail(email);
  return `${TOKEN_VERSION}.${Buffer.from(normalized).toString("base64url")}.${unsubscribeSignature(normalized, secret).toString("base64url")}`;
}

export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION || token.length > 600) return null;
  const email = Buffer.from(parts[1] ?? "", "base64url").toString("utf8");
  if (!email.includes("@") || normalizeEmail(email) !== email) return null;
  const given = Buffer.from(parts[2] ?? "", "base64url");
  const expected = unsubscribeSignature(email, secret);
  return given.length === expected.length && timingSafeEqual(given, expected) ? email : null;
}

export function unsubscribeSecret(explicit?: string): string {
  return requireSecret("UNSUBSCRIBE_TOKEN_SECRET", explicit, "afmeldingslinks (/afmeld)");
}

/** For marketing mails (M8): the one-click unsubscribe URL for an address. */
export function unsubscribeUrl(email: string, opts: { appUrl?: string; secret?: string } = {}): string {
  const base = opts.appUrl ?? serverEnv().APP_URL;
  return `${base}/afmeld?t=${encodeURIComponent(signUnsubscribeToken(email, unsubscribeSecret(opts.secret)))}`;
}

// ─── Retention ─────────────────────────────────────────────────────────

/** docs/09 § 2: unconfirmed GRANTED rows are deleted after 30 days (job consent.expire-unconfirmed). */
export async function expireUnconfirmedConsents(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - consentConfig.unconfirmedRetentionDays * DAY_MS);
  const { count } = await db.consentRecord.deleteMany({
    where: { purpose: PURPOSE, action: "GRANTED", confirmedAt: null, createdAt: { lt: cutoff } },
  });
  return count;
}
