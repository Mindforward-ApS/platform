import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";

// Data processing agreement (docs/10 § 1.2, § 10a): a BUSINESS org's OWNER must accept it before the first
// invitation can be sent — enforced for every invitation path (email, link, domain) via assertDpaAccepted.

export const DPA_VERSION = "dpa.v1";
const DPA_PATH = join(process.cwd(), "content/legal/dpa.v1.md");

export function dpaText(): string {
  return readFileSync(DPA_PATH, "utf8");
}

export function dpaTextHash(): string {
  return createHash("sha256").update(dpaText()).digest("hex");
}

export class DpaError extends Error {
  constructor(public readonly code: "DPA_REQUIRED" | "OWNER_ONLY" | "INVALID") {
    super(code);
    this.name = "DpaError";
  }
}

/** Pure: PERSONAL orgs never invite (rejected elsewhere); BUSINESS orgs need an accepted DPA. */
export function dpaSatisfied(org: { type: "BUSINESS" | "PERSONAL"; dpaAcceptedAt: Date | null }): boolean {
  return org.type !== "BUSINESS" || org.dpaAcceptedAt !== null;
}

export async function assertDpaAccepted(db: PrismaClient, organizationId: string): Promise<void> {
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { type: true, dpaAcceptedAt: true } });
  if (!org || !dpaSatisfied(org)) throw new DpaError("DPA_REQUIRED");
}

export const dpaAcceptInput = z.object({
  signerName: z.string().trim().min(2).max(120),
  signerTitle: z.string().trim().min(2).max(120),
  cvr: z.string().trim().regex(/^\d{8}$/),
  accept: z.literal("on"),
});

export async function acceptDpa(
  db: PrismaClient,
  args: { organizationId: string; userId: string; input: z.infer<typeof dpaAcceptInput>; ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const membership = await db.membership.findFirst({
    where: { organizationId: args.organizationId, userId: args.userId, deactivatedAt: null },
    select: { role: true, organization: { select: { type: true } } },
  });
  if (!membership || membership.role !== "OWNER" || membership.organization.type !== "BUSINESS") throw new DpaError("OWNER_ONLY");
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: args.organizationId }, data: { dpaAcceptedAt: now, dpaVersion: DPA_VERSION, cvr: args.input.cvr } });
    // Evidence row (kept 5 years, § 10a): who accepted, title, CVR, time, version + hash of the exact text.
    await writeAudit(tx, {
      action: "DPA_ACCEPTED",
      actorUserId: args.userId,
      organizationId: args.organizationId,
      targetType: "organization",
      targetId: args.organizationId,
      metadata: { version: DPA_VERSION, textHash: dpaTextHash(), signerName: args.input.signerName, signerTitle: args.input.signerTitle, cvr: args.input.cvr, acceptedAt: now.toISOString() },
      ip: args.ip ?? null,
      userAgent: args.userAgent ?? null,
    });
  });
}
