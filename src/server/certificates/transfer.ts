import "server-only";
import type { OrganizationType, Prisma, PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";

// Carry passed modules and certificates between a learner's own accounts (docs/01 § 4.5):
// private → company when joining, company → private when leaving. The learner decides once per pair of
// accounts; until then nothing is visible to the other account. Attempts (and so prompt texts) never move,
// and a certificate is never re-issued: it is shown in the other account through a CertificateShare.

export class TransferError extends Error {
  constructor(readonly code: "NOT_MEMBER" | "SAME_ACCOUNT" | "ALREADY_DECIDED") {
    super(code);
  }
}

export interface TransferOffer {
  fromOrganizationId: string;
  fromType: OrganizationType;
  fromName: string;
  modules: number;
  certificates: number;
}

/** Visible-in-org filter for certificates: issued there, or shared there by the holder. */
export function certificatesVisibleIn(organizationId: string): Prisma.CertificateWhereInput {
  return { revokedAt: null, OR: [{ organizationId }, { shares: { some: { organizationId } } }] };
}

/** Other accounts of this learner with passed modules or certificates that they have not yet decided about. */
export async function pendingTransferOffers(db: PrismaClient, userId: string, toOrganizationId: string): Promise<TransferOffer[]> {
  const active = await db.membership.findFirst({ where: { userId, organizationId: toOrganizationId, deactivatedAt: null }, select: { id: true } });
  if (!active) return [];
  const [memberships, decided] = await Promise.all([
    db.membership.findMany({
      where: { userId, organizationId: { not: toOrganizationId }, organization: { deletedAt: null } },
      orderBy: { createdAt: "asc" },
      select: { organization: { select: { id: true, name: true, type: true } } },
    }),
    db.credentialTransfer.findMany({ where: { userId, toOrganizationId }, select: { fromOrganizationId: true } }),
  ]);
  const done = new Set(decided.map((d) => d.fromOrganizationId));
  const offers: TransferOffer[] = [];
  for (const { organization: org } of memberships) {
    if (done.has(org.id)) continue;
    const [modules, certificates] = await Promise.all([
      db.assignment.count({ where: { userId, organizationId: org.id, status: "PASSED", passedAt: { not: null } } }),
      db.certificate.count({ where: { userId, organizationId: org.id, revokedAt: null } }),
    ]);
    if (modules + certificates > 0) offers.push({ fromOrganizationId: org.id, fromType: org.type, fromName: org.name, modules, certificates });
  }
  return offers;
}

/** The learner's yes or no. Yes copies passed results (keeping the original date) and shares the certificates. */
export async function decideTransfer(
  db: PrismaClient,
  args: { userId: string; fromOrganizationId: string; toOrganizationId: string; accept: boolean },
): Promise<{ modulesCarried: number; certificatesShared: number }> {
  const { userId, fromOrganizationId, toOrganizationId, accept } = args;
  if (fromOrganizationId === toOrganizationId) throw new TransferError("SAME_ACCOUNT");
  const [target, source] = await Promise.all([
    db.membership.findFirst({ where: { userId, organizationId: toOrganizationId, deactivatedAt: null }, select: { id: true } }),
    // A former company still counts as the learner's own source (that is the "leaving" case).
    db.membership.findFirst({ where: { userId, organizationId: fromOrganizationId, organization: { deletedAt: null } }, select: { id: true } }),
  ]);
  if (!target || !source) throw new TransferError("NOT_MEMBER");

  return db.$transaction(async (tx) => {
    const existing = await tx.credentialTransfer.findUnique({ where: { userId_fromOrganizationId_toOrganizationId: { userId, fromOrganizationId, toOrganizationId } }, select: { id: true } });
    if (existing) throw new TransferError("ALREADY_DECIDED");

    let modulesCarried = 0;
    let certificatesShared = 0;
    if (accept) {
      const passed = await tx.assignment.findMany({
        where: { userId, organizationId: fromOrganizationId, status: "PASSED", passedAt: { not: null } },
        select: { id: true, moduleId: true, passedAt: true, bestScorePct: true },
      });
      const inTarget = await tx.assignment.findMany({ where: { userId, organizationId: toOrganizationId, moduleId: { in: passed.map((p) => p.moduleId) } }, select: { id: true, moduleId: true, status: true } });
      const byModule = new Map(inTarget.map((a) => [a.moduleId, a]));
      for (const p of passed) {
        const there = byModule.get(p.moduleId);
        if (there?.status === "PASSED") continue; // the result earned in this account stays
        const carried = { status: "PASSED" as const, passedAt: p.passedAt, bestScorePct: p.bestScorePct, carriedFromAssignmentId: p.id };
        if (there) await tx.assignment.update({ where: { id: there.id }, data: carried });
        else await tx.assignment.create({ data: { organizationId: toOrganizationId, userId, moduleId: p.moduleId, source: "CARRIED_OVER", ...carried } });
        modulesCarried++;
      }
      const certs = await tx.certificate.findMany({ where: { userId, organizationId: fromOrganizationId, revokedAt: null }, select: { id: true } });
      const shared = await tx.certificateShare.createMany({ data: certs.map((c) => ({ certificateId: c.id, organizationId: toOrganizationId, userId })), skipDuplicates: true });
      certificatesShared = shared.count;
    }

    const record = await tx.credentialTransfer.create({
      data: { userId, fromOrganizationId, toOrganizationId, decision: accept ? "ACCEPTED" : "DECLINED", modulesCarried, certificatesShared },
    });
    await writeAudit(tx, {
      action: accept ? "CREDENTIALS_CARRIED_OVER" : "CREDENTIALS_CARRY_DECLINED",
      actorUserId: userId,
      organizationId: toOrganizationId,
      targetType: "credential_transfer",
      targetId: record.id,
      metadata: { fromOrganizationId, modulesCarried, certificatesShared },
    });
    return { modulesCarried, certificatesShared };
  });
}
