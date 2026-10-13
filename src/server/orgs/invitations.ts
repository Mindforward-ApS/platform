import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import type { JobRole, LicenseTier, Prisma, PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import { assertDpaAccepted, DpaError } from "./dpa";
import { OrgAdminError } from "./errors";
import { checkSeats, type SeatUsage } from "./seats";

// Invitations by email (several at once / CSV paste), by link and by verified domain (docs/01 § 4.2.3).
// Every path checks: BUSINESS org, accepted DPA (§ 10a) and the seat rule (src/server/orgs/seats.ts).

type Tx = Prisma.TransactionClient;
type Db = PrismaClient | Tx;

export const MAX_INVITES_PER_BATCH = 200;
const EMAIL_RE = /[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Extracts unique, lower-cased emails from free text: one per line, comma/semicolon separated or a pasted CSV. */
export function parseEmailList(raw: string): string[] {
  const found = raw.match(EMAIL_RE) ?? [];
  return [...new Set(found.map((e) => e.toLowerCase().replace(/^[.'-]+|[.'-]+$/g, "")))].filter((e) => e.length <= 254);
}

export async function seatUsage(db: Db, organizationId: string, now = new Date()): Promise<SeatUsage> {
  const [org, activeMembers, openInvitations] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { seatLimit: true } }),
    db.membership.count({ where: { organizationId, deactivatedAt: null } }),
    db.invitation.count({ where: { organizationId, status: "pending", expiresAt: { gt: now } } }),
  ]);
  return { seatLimit: org.seatLimit, activeMembers, openInvitations };
}

async function assertBusinessWithDpa(db: PrismaClient, organizationId: string): Promise<void> {
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { type: true, deletedAt: true } });
  if (!org || org.deletedAt) throw new OrgAdminError("NOT_FOUND");
  if (org.type !== "BUSINESS") throw new OrgAdminError("PERSONAL_ORG");
  try {
    await assertDpaAccepted(db, organizationId);
  } catch (err) {
    if (err instanceof DpaError) throw new OrgAdminError("DPA_REQUIRED");
    throw err;
  }
}

async function lockOrg(tx: Tx, organizationId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`org-seats:${organizationId}`}))`;
}

// ── Email ─────────────────────────────────────────────────────────────────

export interface InvitationExtras {
  trackId?: string | null;
  jobRole?: JobRole | null;
  licenseTier?: LicenseTier | null;
}

/** Sends one invitation (Better Auth createInvitation in the app; a fake in tests). Returns the invitation id. */
export type CreateInvitationFn = (email: string, role: "LEARNER" | "ADMIN") => Promise<{ id: string }>;

export async function inviteByEmail(
  db: PrismaClient,
  createInvitation: CreateInvitationFn,
  args: { organizationId: string; actorUserId: string; raw: string; role: "LEARNER" | "ADMIN" } & InvitationExtras,
): Promise<{ sent: string[]; skipped: string[] }> {
  await assertBusinessWithDpa(db, args.organizationId);
  const emails = parseEmailList(args.raw);
  if (emails.length === 0) throw new OrgAdminError("NO_EMAILS");
  if (emails.length > MAX_INVITES_PER_BATCH) throw new OrgAdminError("TOO_MANY");

  const now = new Date();
  const [members, pending] = await Promise.all([
    db.membership.findMany({ where: { organizationId: args.organizationId, deactivatedAt: null, user: { email: { in: emails } } }, select: { user: { select: { email: true } } } }),
    db.invitation.findMany({ where: { organizationId: args.organizationId, status: "pending", expiresAt: { gt: now }, email: { in: emails } }, select: { email: true } }),
  ]);
  const memberEmails = new Set(members.map((m) => m.user.email.toLowerCase()));
  const pendingEmails = new Set(pending.map((p) => p.email.toLowerCase()));
  const toSend = emails.filter((e) => !memberEmails.has(e));
  const skipped = emails.filter((e) => memberEmails.has(e));
  // A re-invite replaces the open invitation (cancelPendingInvitationsOnReInvite), so it takes no extra seat.
  const newSeats = toSend.filter((e) => !pendingEmails.has(e)).length;

  const decision = checkSeats(await seatUsage(db, args.organizationId, now), newSeats);
  if (!decision.ok) throw new OrgAdminError("SEAT_LIMIT_REACHED", decision.message);

  const sent: string[] = [];
  for (const email of toSend) {
    const { id } = await createInvitation(email, args.role);
    await db.invitation.update({
      where: { id },
      data: { trackId: args.trackId ?? null, jobRole: args.jobRole ?? null, licenseTier: args.licenseTier ?? null },
    });
    sent.push(email);
  }
  await writeAudit(db, {
    action: "INVITATIONS_BATCH_CREATED",
    actorUserId: args.actorUserId,
    organizationId: args.organizationId,
    targetType: "organization",
    targetId: args.organizationId,
    metadata: { count: sent.length, skipped: skipped.length, role: args.role, trackId: args.trackId ?? null, jobRole: args.jobRole ?? null },
  });
  return { sent, skipped };
}

/** After Better Auth accepted an invitation: apply its job role and track (called from the plugin hook). */
export async function applyInvitationExtras(db: PrismaClient, invitationId: string, member: { id: string; organizationId: string; userId: string }): Promise<void> {
  const inv = await db.invitation.findUnique({ where: { id: invitationId }, select: { trackId: true, jobRole: true, licenseTier: true } });
  if (!inv) return;
  if (inv.jobRole) await db.membership.update({ where: { id: member.id }, data: { jobRole: inv.jobRole } });
  const trackId = inv.trackId ?? (await db.organization.findUnique({ where: { id: member.organizationId }, select: { defaultTrackId: true } }))?.defaultTrackId ?? null;
  if (trackId) await enrollInTrack(db, member.organizationId, member.userId, trackId, inv.licenseTier);
}

export async function enrollInTrack(db: Db, organizationId: string, userId: string, trackId: string, licenseTier: LicenseTier | null): Promise<void> {
  await db.trackEnrollment.upsert({
    where: { organizationId_userId_trackId: { organizationId, userId, trackId } },
    create: { organizationId, userId, trackId, licenseTier, active: true },
    update: { licenseTier, active: true },
  });
}

// ── Link ──────────────────────────────────────────────────────────────────

export function hashJoinToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates (or resets) the org's join link. The token is shown once; only its hash is stored. */
export async function createJoinLink(db: PrismaClient, args: { organizationId: string; actorUserId: string }): Promise<string> {
  await assertBusinessWithDpa(db, args.organizationId);
  const token = randomBytes(24).toString("base64url");
  await db.organization.update({ where: { id: args.organizationId }, data: { joinLinkTokenHash: hashJoinToken(token), joinLinkEnabled: true } });
  await writeAudit(db, { action: "JOIN_LINK_CREATED", actorUserId: args.actorUserId, organizationId: args.organizationId, targetType: "organization", targetId: args.organizationId });
  return token;
}

export async function disableJoinLink(db: PrismaClient, args: { organizationId: string; actorUserId: string }): Promise<void> {
  await db.organization.update({ where: { id: args.organizationId }, data: { joinLinkTokenHash: null, joinLinkEnabled: false } });
  await writeAudit(db, { action: "JOIN_LINK_DISABLED", actorUserId: args.actorUserId, organizationId: args.organizationId, targetType: "organization", targetId: args.organizationId });
}

export async function findOrgByJoinToken(db: PrismaClient, token: string) {
  if (!token || token.length > 100) return null;
  return db.organization.findFirst({
    where: { joinLinkTokenHash: hashJoinToken(token), joinLinkEnabled: true, deletedAt: null, type: "BUSINESS" },
    select: { id: true, name: true },
  });
}

// ── Join (link + domain) ──────────────────────────────────────────────────

export type JoinVia = "LINK" | "DOMAIN";

/** Adds the user as LEARNER (or reactivates a removed membership) if the seat rule and DPA allow it. */
export async function joinOrganization(db: PrismaClient, args: { organizationId: string; userId: string; via: JoinVia }): Promise<{ membershipId: string }> {
  await assertBusinessWithDpa(db, args.organizationId);
  const result = await db.$transaction(async (tx) => {
    await lockOrg(tx, args.organizationId);
    const existing = await tx.membership.findUnique({ where: { organizationId_userId: { organizationId: args.organizationId, userId: args.userId } } });
    if (existing && !existing.deactivatedAt) throw new OrgAdminError("ALREADY_MEMBER");
    const decision = checkSeats(await seatUsage(tx, args.organizationId), 1);
    if (!decision.ok) throw new OrgAdminError("SEAT_LIMIT_REACHED", decision.message);
    const membership = existing
      ? await tx.membership.update({ where: { id: existing.id }, data: { deactivatedAt: null } })
      : await tx.membership.create({ data: { id: randomUUID(), organizationId: args.organizationId, userId: args.userId, role: "LEARNER" } });
    const org = await tx.organization.findUniqueOrThrow({ where: { id: args.organizationId }, select: { defaultTrackId: true, defaultLicenseTier: true } });
    if (org.defaultTrackId) await enrollInTrack(tx, args.organizationId, args.userId, org.defaultTrackId, org.defaultLicenseTier);
    await writeAudit(tx, {
      action: args.via === "LINK" ? "MEMBER_JOINED_BY_LINK" : "MEMBER_JOINED_BY_DOMAIN",
      actorUserId: args.userId,
      organizationId: args.organizationId,
      targetType: "membership",
      targetId: membership.id,
      metadata: { role: membership.role },
    });
    return { membershipId: membership.id };
  });
  return result;
}

export async function joinByLink(db: PrismaClient, token: string, userId: string) {
  const org = await findOrgByJoinToken(db, token);
  if (!org) throw new OrgAdminError("LINK_INVALID");
  const { membershipId } = await joinOrganization(db, { organizationId: org.id, userId, via: "LINK" });
  return { organizationId: org.id, membershipId };
}

// ── Domain ────────────────────────────────────────────────────────────────

/** Free/public mail providers can never be claimed as a company domain. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.dk", "outlook.com", "outlook.dk", "live.com", "live.dk", "msn.com",
  "yahoo.com", "yahoo.dk", "icloud.com", "me.com", "mac.com", "aol.com", "protonmail.com", "proton.me", "mail.dk", "jubii.dk",
  "sol.dk", "post.tele.dk", "mail.tele.dk", "gmx.com", "gmx.net", "example.com",
]);

const DOMAIN_RE = /^(?=.{3,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

export function normalizeDomain(raw: string): string | null {
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").replace(/\.$/, "");
  return DOMAIN_RE.test(d) ? d : null;
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export const DOMAIN_TXT_PREFIX = "mindforward-verify=";

export function expectedTxtRecord(token: string): string {
  return `${DOMAIN_TXT_PREFIX}${token}`;
}

/** DNS TXT lookup, injected so tests never touch DNS. Returns TXT records as chunk arrays (node:dns format). */
export type TxtResolver = (hostname: string) => Promise<string[][]>;
export const dnsTxtResolver: TxtResolver = (hostname) => resolveTxt(hostname);

export async function setDomain(db: PrismaClient, args: { organizationId: string; actorUserId: string; domain: string }): Promise<{ domain: string; token: string }> {
  await assertBusinessWithDpa(db, args.organizationId);
  const domain = normalizeDomain(args.domain);
  if (!domain) throw new OrgAdminError("DOMAIN_INVALID");
  if (PUBLIC_EMAIL_DOMAINS.has(domain)) throw new OrgAdminError("DOMAIN_PUBLIC");
  const other = await db.organization.findFirst({ where: { verifiedDomain: domain, id: { not: args.organizationId } }, select: { id: true } });
  if (other) throw new OrgAdminError("DOMAIN_TAKEN");
  const token = randomBytes(16).toString("hex");
  await db.organization.update({ where: { id: args.organizationId }, data: { verifiedDomain: domain, domainVerificationToken: token, domainVerifiedAt: null } });
  await writeAudit(db, { action: "DOMAIN_SET", actorUserId: args.actorUserId, organizationId: args.organizationId, targetType: "organization", targetId: args.organizationId, metadata: { domain } });
  return { domain, token };
}

export async function verifyDomain(db: PrismaClient, resolver: TxtResolver, args: { organizationId: string; actorUserId: string }): Promise<{ verified: boolean }> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: args.organizationId }, select: { verifiedDomain: true, domainVerificationToken: true, domainVerifiedAt: true } });
  if (!org.verifiedDomain || !org.domainVerificationToken) throw new OrgAdminError("DOMAIN_INVALID");
  if (org.domainVerifiedAt) return { verified: true };
  let records: string[][] = [];
  try {
    records = await resolver(org.verifiedDomain);
  } catch {
    records = [];
  }
  const expected = expectedTxtRecord(org.domainVerificationToken);
  if (!records.some((chunks) => chunks.join("").trim() === expected)) return { verified: false };
  await db.organization.update({ where: { id: args.organizationId }, data: { domainVerifiedAt: new Date() } });
  await writeAudit(db, { action: "DOMAIN_VERIFIED", actorUserId: args.actorUserId, organizationId: args.organizationId, targetType: "organization", targetId: args.organizationId, metadata: { domain: org.verifiedDomain } });
  return { verified: true };
}

export async function removeDomain(db: PrismaClient, args: { organizationId: string; actorUserId: string }): Promise<void> {
  await db.organization.update({ where: { id: args.organizationId }, data: { verifiedDomain: null, domainVerificationToken: null, domainVerifiedAt: null } });
  await writeAudit(db, { action: "DOMAIN_REMOVED", actorUserId: args.actorUserId, organizationId: args.organizationId, targetType: "organization", targetId: args.organizationId });
}

/** The verified-domain org a user could join (verified email on that domain, not already an active member). */
export async function findDomainOrgForUser(db: PrismaClient, user: { id: string; email: string; emailVerified: boolean }) {
  if (!user.emailVerified) return null;
  const domain = emailDomain(user.email);
  if (!domain) return null;
  return db.organization.findFirst({
    where: { verifiedDomain: domain, domainVerifiedAt: { not: null }, deletedAt: null, type: "BUSINESS", members: { none: { userId: user.id, deactivatedAt: null } } },
    select: { id: true, name: true },
  });
}

export async function joinByDomain(db: PrismaClient, organizationId: string, user: { id: string; email: string; emailVerified: boolean }) {
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { verifiedDomain: true, domainVerifiedAt: true } });
  if (!org?.verifiedDomain || !org.domainVerifiedAt) throw new OrgAdminError("DOMAIN_NOT_VERIFIED");
  if (!user.emailVerified) throw new OrgAdminError("EMAIL_NOT_VERIFIED");
  if (emailDomain(user.email) !== org.verifiedDomain) throw new OrgAdminError("DOMAIN_MISMATCH");
  return joinOrganization(db, { organizationId, userId: user.id, via: "DOMAIN" });
}
