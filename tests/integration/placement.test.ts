import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { seedAll } from "@/server/content/seed";
import type { EmailTransport } from "@/server/email/send";
import { getPlacementTest } from "@/server/placement/content";
import { claimPlacement, findAnonymousResult, latestUserResult, resultView } from "@/server/placement/service";
import { signupMarketingConsent, submitPlacement } from "@/server/placement/submit";
import { signStartToken } from "@/server/placement/tokens";
import { correctAnswers } from "../fixtures/placement";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

const secret = "integration-test-secret-integration-test";
const test = getPlacementTest("COPILOT");
const ip = () => `198.51.100.${Math.floor(Math.random() * 250)}-${randomUUID().slice(0, 4)}`;

function fields(overrides: Record<string, string> = {}, startedSecondsAgo = 60) {
  const now = Date.now();
  return {
    nowMs: now,
    fields: {
      ...correctAnswers(test),
      jobRole: "SALES",
      licenseTier: "COPILOT_CHAT",
      startToken: signStartToken(test.track, now - startedSecondsAgo * 1000, secret),
      ...overrides,
    },
  };
}

// Nothing is published by the seed yet (golden sets pending), so publish one catalog module for these tests.
async function ensurePublished(slug: string, level: number) {
  const tracks = await testDb().track.findMany({ where: { key: { in: ["CHATGPT", "COPILOT", "CLAUDE"] } } });
  const mod = await testDb().module.upsert({ where: { slug }, create: { slug, type: "CORE", requiredLicense: "COPILOT_CHAT" }, update: {} });
  await testDb().moduleTrack.createMany({ data: tracks.map((t) => ({ moduleId: mod.id, trackId: t.id })), skipDuplicates: true });
  const version = await testDb().moduleVersion.upsert({
    where: { moduleId_version: { moduleId: mod.id, version: 1 } },
    create: { moduleId: mod.id, version: 1, status: "PUBLISHED", schemaVersion: "1", title: slug, content: { level }, maxPoints: 10, estimatedMinutes: 8, searchText: slug, contentHash: slug },
    update: {},
  });
  await testDb().module.update({ where: { id: mod.id }, data: { publishedVersionId: version.id } });
}

beforeAll(async () => {
  await seedAll(testDb());
  await ensurePublished("core-llm-01", 1);
});

describe("public placement submit", () => {
  it("saves an anonymous result (option ids only) with a hashed cookie token", async () => {
    const res = await submitPlacement(testDb(), { test, ...fields(), meta: { ip: ip(), userAgent: "ua" }, secret });
    if (!res.ok) throw new Error(res.error);
    expect(res.anonymousToken).toBeTruthy();
    const row = await findAnonymousResult(testDb(), res.anonymousToken ?? "");
    expect(row).toMatchObject({ id: res.resultId, userId: null, licenseTier: "COPILOT_CHAT", jobRole: "SALES", testVersion: "placement-copilot.v1", level: 3 });
    expect(row?.anonymousTokenHash).not.toBe(res.anonymousToken);
    expect(row?.recommendedModuleIds).toContain("role-sales-01");
    expect(row?.recommendedModuleIds).not.toContain("feat-copilot-m365-01");
    expect(JSON.stringify(row?.answers)).not.toMatch(/Copilot/); // ids only, no text
  });

  it("rejects the honeypot, a too-fast submit, a forged start token and incomplete answers", async () => {
    const meta = { ip: ip(), userAgent: "ua" };
    expect(await submitPlacement(testDb(), { test, ...fields({ website: "http://spam" }), meta, secret })).toEqual({ ok: false, error: "BOT" });
    expect(await submitPlacement(testDb(), { test, ...fields({}, 2), meta, secret })).toEqual({ ok: false, error: "TOO_FAST" });
    expect(await submitPlacement(testDb(), { test, ...fields({ startToken: "123.forged" }), meta, secret })).toEqual({ ok: false, error: "BOT" });
    expect(await submitPlacement(testDb(), { test, ...fields({ q01: "" }), meta, secret })).toEqual({ ok: false, error: "INCOMPLETE" });
    expect(await submitPlacement(testDb(), { test, ...fields({ licenseTier: "" }), meta, secret })).toEqual({ ok: false, error: "INCOMPLETE" });
  });

  it("rate limit: 10 per hour per IP", async () => {
    const meta = { ip: ip(), userAgent: "ua" };
    for (let i = 0; i < 10; i++) expect((await submitPlacement(testDb(), { test, ...fields(), meta, secret })).ok).toBe(true);
    expect(await submitPlacement(testDb(), { test, ...fields(), meta, secret })).toEqual({ ok: false, error: "RATE_LIMITED" });
  });

  it("a logged-in learner's result is saved directly with assignments + enrollment", async () => {
    const user = await makeUser();
    const org = await makeOrg("PERSONAL");
    await addMember(org.id, user.id, "OWNER");
    const res = await submitPlacement(testDb(), { test, ...fields(), meta: { ip: ip(), userAgent: "ua" }, secret, user: { id: user.id, organizationId: org.id } });
    if (!res.ok) throw new Error(res.error);
    expect(res.anonymousToken).toBeNull();
    expect((await latestUserResult(testDb(), user.id, org.id))?.id).toBe(res.resultId);
    const assignments = await testDb().assignment.findMany({ where: { organizationId: org.id, userId: user.id }, include: { module: true } });
    expect(assignments.map((a) => [a.module.slug, a.source])).toEqual([["core-llm-01", "PLACEMENT"]]);
    const enrollment = await testDb().trackEnrollment.findFirstOrThrow({ where: { organizationId: org.id, userId: user.id } });
    expect(enrollment).toMatchObject({ licenseTier: "COPILOT_CHAT", level: 3, active: true });
  });
});

describe("claim after signup", () => {
  it("keeps the result, moves it to the user once, and creates the plan", async () => {
    const res = await submitPlacement(testDb(), { test, ...fields({ q01: test.questions[0]?.options.find((o) => o.id !== test.questions[0]?.correct)?.id ?? "a" }), meta: { ip: ip(), userAgent: "ua" }, secret });
    if (!res.ok || !res.anonymousToken) throw new Error("no token");
    const before = await testDb().placementResult.findUniqueOrThrow({ where: { id: res.resultId } });

    const user = await makeUser();
    const org = await makeOrg("PERSONAL");
    await addMember(org.id, user.id, "OWNER");
    expect(await claimPlacement(testDb(), { token: res.anonymousToken, userId: user.id, organizationId: org.id })).toBe(res.resultId);

    const after = await testDb().placementResult.findUniqueOrThrow({ where: { id: res.resultId } });
    expect(after).toMatchObject({ userId: user.id, organizationId: org.id, anonymousTokenHash: null, level: before.level, recommendedModuleIds: before.recommendedModuleIds });
    expect(after.claimedAt).toBeInstanceOf(Date);
    expect(after.answers).toEqual(before.answers);
    expect(await testDb().assignment.count({ where: { organizationId: org.id, userId: user.id, source: "PLACEMENT" } })).toBe(1);

    // Single use: a second user cannot claim the same cookie.
    const other = await makeUser();
    const otherOrg = await makeOrg("PERSONAL");
    expect(await claimPlacement(testDb(), { token: res.anonymousToken, userId: other.id, organizationId: otherOrg.id })).toBeNull();

    const view = await resultView(testDb(), after);
    expect(view?.plan.score.areas.find((a) => a.id === "MODEL")?.state).toBe("PARTIAL");
  });

  it("results are org-scoped: another org of the same user does not see it", async () => {
    const user = await makeUser();
    const org = await makeOrg("PERSONAL");
    const business = await makeOrg("BUSINESS");
    await addMember(org.id, user.id, "OWNER");
    await addMember(business.id, user.id, "LEARNER");
    await submitPlacement(testDb(), { test, ...fields(), meta: { ip: ip(), userAgent: "ua" }, secret, user: { id: user.id, organizationId: org.id } });
    expect(await latestUserResult(testDb(), user.id, business.id)).toBeNull();
    expect(await testDb().assignment.count({ where: { organizationId: business.id, userId: user.id } })).toBe(0);
  });
});

describe("marketing consent signup on the result page", () => {
  const transport = (): EmailTransport & { sent: string[] } => {
    const sent: string[] = [];
    return { name: "fake", sent, send: vi.fn(async (m) => (sent.push(m.text), { providerId: null })) };
  };
  const base = (email: string, overrides: Partial<Parameters<typeof signupMarketingConsent>[1]> = {}) => ({
    email,
    consent: "yes",
    honeypot: undefined,
    meta: { ip: ip(), userAgent: "ua" },
    appUrl: "http://localhost:3000",
    ...overrides,
  });

  it("an unticked checkbox records nothing and sends nothing", async () => {
    const email = `c-${randomUUID().slice(0, 8)}@example.test`;
    const t = transport();
    expect(await signupMarketingConsent(testDb(), base(email, { consent: undefined }), { transport: t, enforceAllowlist: false })).toEqual({ ok: false, error: "NOT_TICKED" });
    expect(await testDb().consentRecord.count({ where: { subjectEmail: email } })).toBe(0);
    expect(t.sent).toHaveLength(0);
  });

  it("a ticked checkbox stores GRANTED and sends the SERVICE confirmation mail with the link", async () => {
    const email = `c-${randomUUID().slice(0, 8)}@example.test`;
    const t = transport();
    expect(await signupMarketingConsent(testDb(), base(email), { transport: t, enforceAllowlist: false })).toEqual({ ok: true });
    expect(await testDb().consentRecord.findFirst({ where: { subjectEmail: email } })).toMatchObject({ action: "GRANTED", source: "PLACEMENT_RESULT" });
    expect(t.sent[0]).toMatch(/\/samtykke\/bekraeft\?t=/);
    expect(await testDb().emailMessage.findFirst({ where: { toEmail: email } })).toMatchObject({ category: "SERVICE", template: "marketing-confirm" });
  });

  it("rate limit: 5 per hour per email", async () => {
    const email = `c-${randomUUID().slice(0, 8)}@example.test`;
    const t = transport();
    for (let i = 0; i < 5; i++) expect((await signupMarketingConsent(testDb(), base(email), { transport: t, enforceAllowlist: false })).ok).toBe(true);
    expect(await signupMarketingConsent(testDb(), base(email), { transport: t, enforceAllowlist: false })).toEqual({ ok: false, error: "RATE_LIMITED" });
  });

  it("rate limit: 5 per hour per IP", async () => {
    const meta = { ip: ip(), userAgent: "ua" };
    const t = transport();
    for (let i = 0; i < 5; i++) expect((await signupMarketingConsent(testDb(), base(`c-${randomUUID().slice(0, 8)}@example.test`, { meta }), { transport: t, enforceAllowlist: false })).ok).toBe(true);
    expect(await signupMarketingConsent(testDb(), base(`c-${randomUUID().slice(0, 8)}@example.test`, { meta }), { transport: t, enforceAllowlist: false })).toEqual({ ok: false, error: "RATE_LIMITED" });
  });
});
