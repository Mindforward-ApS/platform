import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { seedCourses } from "@/server/courses/seed";
import { exportUserData } from "@/server/gdpr/service";
import {
  applySignupProfile,
  completeOnboarding,
  loadOnboarding,
  needsLearnerOnboarding,
  nextStepFor,
  OnboardingError,
  planPreview,
  saveCompany,
  savePersonalPlan,
  saveStartPath,
  saveTrack,
} from "@/server/onboarding/service";
import { addMember, makeOrg, makeSession, makeUser, testDb } from "./helpers";

// Sign-up onboarding persistence (approved preview, Marco 11 Nov 2026) against the integration database.

async function privat() {
  const [org, user] = await Promise.all([makeOrg("PERSONAL"), makeUser()]);
  await addMember(org.id, user.id, "OWNER");
  return { userId: user.id, organizationId: org.id };
}

describe("sign-up profile", () => {
  it("stores first name, last name, phone and fills an empty name", async () => {
    const user = await testDb().user.create({ data: { id: randomUUID(), name: "", email: `s-${randomUUID()}@example.test`, emailVerified: true } });
    await applySignupProfile(testDb(), user.id, { firstName: "Sofie", lastName: "Hansen", phone: "+4512345678" });
    expect(await testDb().user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({ name: "Sofie Hansen", firstName: "Sofie", lastName: "Hansen", phone: "+4512345678" });
  });

  it("never overwrites what an existing user already has", async () => {
    const user = await makeUser();
    await testDb().user.update({ where: { id: user.id }, data: { phone: "+4511111111" } });
    await applySignupProfile(testDb(), user.id, { firstName: "Ny", lastName: "Navn", phone: "+4599999999" });
    expect(await testDb().user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({ name: "Test Bruger", firstName: "Ny", phone: "+4511111111" });
  });
});

describe("privat flow", () => {
  it("membership → start → tool → plan, stored per user per org", async () => {
    const owner = await privat();
    expect(nextStepFor(await loadOnboarding(testDb(), owner))).toBe("medlemskab");

    await savePersonalPlan(testDb(), owner, { plan: "FRIEND", friendEmail: "ven@example.test" });
    expect(nextStepFor(await loadOnboarding(testDb(), owner))).toBe("start");

    await saveStartPath(testDb(), owner, "FROM_SCRATCH");
    expect(nextStepFor(await loadOnboarding(testDb(), owner))).toBe("vaerktoej");

    const { trackId } = await saveTrack(testDb(), owner, "CLAUDE");
    const ctx = await loadOnboarding(testDb(), owner);
    expect(nextStepFor(ctx)).toBe("plan");
    expect(ctx.profile).toMatchObject({ personalPlan: "FRIEND", friendEmail: "ven@example.test", studentEmail: null, startPath: "FROM_SCRATCH", trackId, completedAt: null });
    expect(await testDb().trackEnrollment.findUniqueOrThrow({ where: { organizationId_userId_trackId: { ...owner, trackId } } })).toMatchObject({ active: true });

    await completeOnboarding(testDb(), owner);
    const done = (await loadOnboarding(testDb(), owner)).profile?.completedAt;
    expect(done).toBeInstanceOf(Date);
    await completeOnboarding(testDb(), owner);
    expect((await loadOnboarding(testDb(), owner)).profile?.completedAt).toEqual(done);
  });

  it("switching membership clears the other plan's extra field", async () => {
    const owner = await privat();
    await savePersonalPlan(testDb(), owner, { plan: "STUDENT", studentEmail: "navn@student.example.test" });
    await savePersonalPlan(testDb(), owner, { plan: "SINGLE" });
    expect((await loadOnboarding(testDb(), owner)).profile).toMatchObject({ personalPlan: "SINGLE", studentEmail: null, friendEmail: null });
  });

  it("requires the friend's email / study mail for those plans", async () => {
    const owner = await privat();
    await expect(savePersonalPlan(testDb(), owner, { plan: "FRIEND" })).rejects.toBeInstanceOf(OnboardingError);
    await expect(savePersonalPlan(testDb(), owner, { plan: "STUDENT" })).rejects.toBeInstanceOf(OnboardingError);
  });

  it("with the placement test, the plan waits for a result on the chosen track", async () => {
    const owner = await privat();
    await savePersonalPlan(testDb(), owner, { plan: "SINGLE" });
    await saveStartPath(testDb(), owner, "PLACEMENT_TEST");
    const { trackId } = await saveTrack(testDb(), owner, "CHATGPT");
    expect(nextStepFor(await loadOnboarding(testDb(), owner))).toBe("test");
    await testDb().placementResult.create({ data: { ...owner, trackId, testVersion: "t", answers: {}, scorePct: 50, level: 2 } });
    const ctx = await loadOnboarding(testDb(), owner);
    expect(nextStepFor(ctx)).toBe("plan");
    expect(ctx.latestPlacementLevel).toBe(2);
  });
});

describe("authz and scoping", () => {
  it("refuses answers for an organization the user is not a member of (cross-org)", async () => {
    const a = await privat();
    const b = await privat();
    const foreign = { userId: a.userId, organizationId: b.organizationId };
    await expect(saveStartPath(testDb(), foreign, "FROM_SCRATCH")).rejects.toMatchObject({ code: "NOT_MEMBER" });
    await expect(saveTrack(testDb(), foreign, "CHATGPT")).rejects.toMatchObject({ code: "NOT_MEMBER" });
    await expect(loadOnboarding(testDb(), foreign)).rejects.toMatchObject({ code: "NOT_MEMBER" });
    expect(await testDb().onboardingProfile.count({ where: { organizationId: b.organizationId, userId: a.userId } })).toBe(0);
  });

  it("refuses a private membership choice inside a business", async () => {
    const [org, user] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
    await addMember(org.id, user.id, "OWNER");
    await expect(savePersonalPlan(testDb(), { userId: user.id, organizationId: org.id }, { plan: "SINGLE" })).rejects.toMatchObject({ code: "WRONG_ORG_TYPE" });
  });

  it("a deactivated member cannot write answers", async () => {
    const [org, user] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
    const m = await addMember(org.id, user.id, "LEARNER");
    await testDb().membership.update({ where: { id: m.id }, data: { deactivatedAt: new Date() } });
    await expect(saveStartPath(testDb(), { userId: user.id, organizationId: org.id }, "FROM_SCRATCH")).rejects.toMatchObject({ code: "NOT_MEMBER" });
  });
});

describe("erhverv flow", () => {
  it("creates the company with the user as OWNER, switches the session and stores the team size", async () => {
    const user = await makeUser();
    const session = await makeSession(user.id);
    const { organizationId } = await saveCompany(testDb(), { userId: user.id, sessionId: session.id, activeOrganizationId: null, name: "Nordlys Test ApS", band: "SIZE_10_PLUS" });
    expect(await testDb().organization.findUniqueOrThrow({ where: { id: organizationId } })).toMatchObject({ type: "BUSINESS", name: "Nordlys Test ApS" });
    expect(await testDb().membership.findFirstOrThrow({ where: { organizationId, userId: user.id } })).toMatchObject({ role: "OWNER" });
    expect((await testDb().session.findUniqueOrThrow({ where: { id: session.id } })).activeOrganizationId).toBe(organizationId);
    const ctx = await loadOnboarding(testDb(), { userId: user.id, organizationId });
    expect(ctx.role).toBe("virksomhed");
    expect(ctx.profile?.teamSizeBand).toBe("SIZE_10_PLUS");
    expect(nextStepFor(ctx)).toBe("start");
  });

  it("a second visit updates the same company instead of creating another", async () => {
    const user = await makeUser();
    const session = await makeSession(user.id);
    const first = await saveCompany(testDb(), { userId: user.id, sessionId: session.id, activeOrganizationId: null, name: "Første ApS", band: "SIZE_1_9" });
    const second = await saveCompany(testDb(), { userId: user.id, sessionId: session.id, activeOrganizationId: first.organizationId, name: "Rettet ApS", band: "ENTERPRISE" });
    expect(second.organizationId).toBe(first.organizationId);
    expect(await testDb().membership.count({ where: { userId: user.id } })).toBe(1);
    expect((await testDb().organization.findUniqueOrThrow({ where: { id: first.organizationId } })).name).toBe("Rettet ApS");
    expect(await testDb().auditLog.count({ where: { action: "ORG_RENAMED", organizationId: first.organizationId } })).toBe(1);
  });

  it("a LEARNER whose active org is a business still gets a new company, never edits the employer's", async () => {
    const [employer, user] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
    await addMember(employer.id, user.id, "LEARNER");
    const session = await makeSession(user.id, employer.id);
    const { organizationId } = await saveCompany(testDb(), { userId: user.id, sessionId: session.id, activeOrganizationId: employer.id, name: "Mit Eget ApS", band: "SIZE_1_9" });
    expect(organizationId).not.toBe(employer.id);
    expect((await testDb().organization.findUniqueOrThrow({ where: { id: employer.id } })).name).toBe(employer.name);
  });
});

describe("invited employee", () => {
  it("needs the short onboarding until it is completed; owners and private users do not", async () => {
    const [org, learner, owner] = await Promise.all([makeOrg("BUSINESS"), makeUser(), makeUser()]);
    await addMember(org.id, learner.id, "LEARNER");
    await addMember(org.id, owner.id, "OWNER");
    const l = { userId: learner.id, organizationId: org.id };
    expect(await needsLearnerOnboarding(testDb(), l)).toBe(true);
    expect(await needsLearnerOnboarding(testDb(), { userId: owner.id, organizationId: org.id })).toBe(false);
    expect(await needsLearnerOnboarding(testDb(), await privat())).toBe(false);

    const ctx = await loadOnboarding(testDb(), l);
    expect(ctx.role).toBe("medarbejder");
    expect(nextStepFor(ctx)).toBe("start");
    await saveStartPath(testDb(), l, "FROM_SCRATCH");
    await saveTrack(testDb(), l, "COPILOT");
    await completeOnboarding(testDb(), l);
    expect(await needsLearnerOnboarding(testDb(), l)).toBe(false);
  });
});

describe("Din plan er klar", () => {
  it("from scratch: first level of the chosen course, first three lessons, link to the first ready lesson", async () => {
    await seedCourses(testDb());
    const owner = await privat();
    await savePersonalPlan(testDb(), owner, { plan: "SINGLE" });
    await saveStartPath(testDb(), owner, "FROM_SCRATCH");
    await saveTrack(testDb(), owner, "CHATGPT");
    const plan = await planPreview(testDb(), await loadOnboarding(testDb(), owner));
    const course = await testDb().course.findUniqueOrThrow({ where: { slug: "chatgpt" }, select: { levels: { orderBy: { sortOrder: "asc" }, take: 1, select: { name: true } } } });
    expect(plan).toMatchObject({ trackSlug: "chatgpt", levelName: course.levels[0]?.name });
    expect(plan?.lessons.length).toBeGreaterThan(0);
    expect(plan?.lessons.length).toBeLessThanOrEqual(3);
    expect(plan?.firstLessonHref).toMatch(/^\/forloeb\/chatgpt(\/[\w-]+)?$/);
  });
});

describe("GDPR", () => {
  it("the user's own export contains the phone and the onboarding answers", async () => {
    const owner = await privat();
    await testDb().user.update({ where: { id: owner.userId }, data: { phone: "+4512345678", firstName: "Sofie" } });
    await savePersonalPlan(testDb(), owner, { plan: "FRIEND", friendEmail: "ven@example.test" });
    const out = await exportUserData(testDb(), owner.userId, { skipRateLimit: true });
    expect(out.profile).toMatchObject({ phone: "+4512345678", firstName: "Sofie" });
    expect(out.onboardingProfiles).toEqual([expect.objectContaining({ personalPlan: "FRIEND", friendEmail: "ven@example.test" })]);
  });
});
