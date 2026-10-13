import { randomUUID } from "node:crypto";
import type { LicenseTier, ModuleType, SubscriptionStatus, TrackKey } from "@/generated/prisma/client";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

// Fixtures for M8: fixture NEWS modules (docs/00 § 10a — the content engine produces real NEWS in M9).

export async function ensureTrack(key: TrackKey = "CHATGPT") {
  return testDb().track.upsert({
    where: { key },
    create: { key, displayName: key, vendorName: "Test", skinKey: key.toLowerCase(), isActive: true, licenseTiers: key === "COPILOT" ? ["COPILOT_CHAT", "COPILOT_M365"] : [] },
    update: { isActive: true },
  });
}

export async function makeModule(trackId: string, opts: { type?: ModuleType; minutes?: number; publishedAt?: Date; requiredLicense?: LicenseTier | null; sortOrder?: number; title?: string } = {}) {
  const slug = `fx-${(opts.type ?? "NEWS").toLowerCase()}-${randomUUID().slice(0, 8)}`;
  const mod = await testDb().module.create({
    data: { slug, type: opts.type ?? "NEWS", requiredLicense: opts.requiredLicense ?? null, sortOrder: opts.sortOrder ?? 0, tracks: { create: { trackId } } },
  });
  const version = await testDb().moduleVersion.create({
    data: {
      moduleId: mod.id,
      version: 1,
      status: "PUBLISHED",
      origin: "AUTO",
      schemaVersion: "1",
      title: opts.title ?? `Fixture ${slug}`,
      content: { id: slug },
      maxPoints: 10,
      estimatedMinutes: opts.minutes ?? 4,
      requiredLicense: opts.requiredLicense ?? null,
      searchText: slug,
      contentHash: randomUUID(),
      publishedAt: opts.publishedAt ?? new Date(),
    },
  });
  await testDb().module.update({ where: { id: mod.id }, data: { publishedVersionId: version.id } });
  return { ...mod, versionId: version.id };
}

export async function makeSubscription(organizationId: string, status: SubscriptionStatus = "ACTIVE", planKey = "B2B_MONTHLY") {
  const id = randomUUID();
  return testDb().subscription.create({
    data: {
      organizationId,
      planKey,
      stripeSubscriptionId: `sub_${id}`,
      stripeCustomerId: `cus_${id}`,
      stripePriceId: "price_test",
      status,
      quantity: 5,
      currentPeriodStart: new Date(Date.now() - 86_400_000),
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      lastStripeEventAt: new Date(),
      lastStripeEventId: `evt_${id}`,
    },
  });
}

/** An org learner enrolled on a track. */
export async function makeLearner(organizationId: string, trackId: string, opts: { licenseTier?: LicenseTier | null; remindersEnabled?: boolean } = {}) {
  const user = await makeUser();
  if (opts.remindersEnabled === false) await testDb().user.update({ where: { id: user.id }, data: { trainingRemindersEnabled: false } });
  await addMember(organizationId, user.id, "LEARNER");
  await testDb().trackEnrollment.create({ data: { organizationId, userId: user.id, trackId, licenseTier: opts.licenseTier ?? null } });
  return user;
}

export async function makeEntitledOrg() {
  const org = await makeOrg("BUSINESS");
  await makeSubscription(org.id, "ACTIVE");
  return org;
}

/** A far-away, unique month so repeated runs on the shared test DB never collide. */
export function uniqueMonth(): string {
  return `${2200 + Math.floor(Math.random() * 7000)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}`;
}
