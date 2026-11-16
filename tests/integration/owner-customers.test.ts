import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { SubscriptionStatus } from "@/generated/prisma/client";
import { findForbiddenKeys } from "@/server/admin/allowed-fields";
import { seedModules, seedTracks } from "@/server/content/seed";
import { customerOverview } from "@/server/owner/customers";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

// Owner customer overview (/admin/kunder). The test database is shared with other files, so every assertion
// looks at rows this file created, or at deltas.

const db = testDb();
const DAY = 24 * 60 * 60 * 1000;
let moduleId: string;

beforeAll(async () => {
  await seedTracks(db);
  await seedModules(db, new Set());
  moduleId = (await db.module.findFirstOrThrow({ select: { id: true } })).id;
});

async function subscribe(organizationId: string, planKey: string, status: SubscriptionStatus, quantity: number) {
  return db.subscription.create({
    data: {
      organizationId,
      planKey,
      status,
      quantity,
      stripeSubscriptionId: `sub_${randomUUID()}`,
      stripeCustomerId: `cus_${randomUUID()}`,
      stripePriceId: "price_test",
      lastStripeEventAt: new Date(),
      lastStripeEventId: `evt_${randomUUID()}`,
    },
  });
}

async function memberWhoPassed(organizationId: string) {
  const user = await makeUser();
  await addMember(organizationId, user.id, "LEARNER");
  await db.assignment.create({
    data: { organizationId, userId: user.id, moduleId, source: "SELF", status: "PASSED", bestScorePct: 90, passedAt: new Date() },
  });
  return user;
}

describe("customerOverview", () => {
  it("lists a company with seats, completion among active members, MRR ex. VAT and status", async () => {
    const org = await makeOrg("BUSINESS");
    const owner = await makeUser();
    await addMember(org.id, owner.id, "OWNER");
    await memberWhoPassed(org.id);
    await memberWhoPassed(org.id);
    const left = await memberWhoPassed(org.id);
    await db.membership.updateMany({ where: { organizationId: org.id, userId: left.id }, data: { deactivatedAt: new Date() } });
    await subscribe(org.id, "B2B_MONTHLY", "ACTIVE", 5);

    const o = await customerOverview(db);
    const row = o.companies.find((c) => c.organizationId === org.id);
    expect(row).toMatchObject({
      name: org.name,
      activeMembers: 3, // owner + two who passed; the deactivated member is not counted
      membersWithPassed: 2,
      completionPct: 67,
      mrrOre: 4900 * 5,
      paidSeats: 5,
      planKey: "B2B_MONTHLY",
      status: { kind: "ONBOARDING" }, // created today
    });
  });

  it("flags an old paying company without any activity as inactive, and a past-due one as a payment issue", async () => {
    const quiet = await makeOrg("BUSINESS");
    await db.organization.update({ where: { id: quiet.id }, data: { createdAt: new Date(Date.now() - 40 * DAY) } });
    await subscribe(quiet.id, "B2B_MONTHLY", "ACTIVE", 5);
    const late = await makeOrg("BUSINESS");
    await subscribe(late.id, "B2B_MONTHLY", "PAST_DUE", 5);

    const o = await customerOverview(db);
    expect(o.companies.find((c) => c.organizationId === quiet.id)?.status).toEqual({ kind: "INACTIVE", days: null });
    expect(o.companies.find((c) => c.organizationId === late.id)?.status).toEqual({ kind: "PAYMENT_ISSUE" });
  });

  it("uses the open subscription when an older one was cancelled", async () => {
    const org = await makeOrg("BUSINESS");
    await subscribe(org.id, "B2B_MONTHLY", "CANCELED", 5);
    await subscribe(org.id, "B2B_ANNUAL", "TRIALING", 5);
    const row = (await customerOverview(db)).companies.find((c) => c.organizationId === org.id);
    expect(row).toMatchObject({ planKey: "B2B_ANNUAL", status: { kind: "TRIAL" }, mrrOre: 0, paidSeats: 0 });
  });

  it("leaves deleted companies out", async () => {
    const org = await makeOrg("BUSINESS");
    await db.organization.update({ where: { id: org.id }, data: { deletedAt: new Date() } });
    expect((await customerOverview(db)).companies.some((c) => c.organizationId === org.id)).toBe(false);
  });

  it("counts private customers in one aggregated line — paying ones only, never listed by person", async () => {
    const before = (await customerOverview(db)).privateCustomers;

    const paying = await makeOrg("PERSONAL");
    const payer = await makeUser();
    await addMember(paying.id, payer.id, "OWNER");
    await subscribe(paying.id, "B2C_MONTHLY", "ACTIVE", 1);
    const free = await makeOrg("PERSONAL");
    await addMember(free.id, (await makeUser()).id, "OWNER");

    const o = await customerOverview(db);
    expect(o.privateCustomers.count - before.count).toBe(1);
    expect(o.privateCustomers.mrrOre - before.mrrOre).toBe(3920); // 49 kr incl. VAT → 39,20 kr net
    expect(o.companies.some((c) => c.organizationId === paying.id || c.organizationId === free.id)).toBe(false);
    expect(JSON.stringify(o.privateCustomers)).not.toContain(payer.email);
  });

  it("totals add up and the result carries no forbidden admin fields", async () => {
    const o = await customerOverview(db);
    const companyMrr = o.companies.reduce((acc, c) => acc + c.mrrOre, 0);
    expect(o.totals.mrrOre).toBe(companyMrr + o.privateCustomers.mrrOre);
    expect(o.totals.arrOre).toBe(o.totals.mrrOre * 12);
    expect(findForbiddenKeys(o)).toEqual([]);
  });
});
