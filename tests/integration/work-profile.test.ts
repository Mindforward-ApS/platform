import { beforeAll, describe, expect, it } from "vitest";
import { seedConnectors } from "@/server/connectors/seed";
import { fixtureProvider } from "@/server/connectors/lookup";
import { getWorkProfile, lookupCompany, recommendationsFor, saveIndustry, saveSystems, skipProfile, systemsForProfile } from "@/server/connectors/service";
import { needsProfile } from "@/server/orgs/start";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

beforeAll(async () => {
  await seedConnectors(testDb());
});

async function member() {
  const [org, user] = await Promise.all([makeOrg("PERSONAL"), makeUser()]);
  await addMember(org.id, user.id, "OWNER");
  return { userId: user.id, organizationId: org.id };
}

describe("work profile → connector recommendations", () => {
  it("CVR lookup matches the industry (fixture provider, cached)", async () => {
    const s = await member();
    const r = await lookupCompany(testDb(), s, "0000 0003", fixtureProvider);
    expect(r).toMatchObject({ kind: "found", company: { name: "Revisionsfirmaet Bjerre ApS (fiktiv)" }, industry: { name: "Revision & regnskab" } });
    expect(await testDb().companyLookupCache.count({ where: { cvr: "00000003" } })).toBe(1);
    expect(await lookupCompany(testDb(), s, "123", fixtureProvider)).toEqual({ kind: "invalid" });
    expect(await lookupCompany(testDb(), s, "00000009", fixtureProvider)).toEqual({ kind: "not-found" });
    expect(await lookupCompany(testDb(), s, "00000003", null)).toEqual({ kind: "unavailable" });
  });

  it("saves industry with suggested systems, then systems → completed; recommendations depend on the platform", async () => {
    const s = await member();
    const revision = await testDb().industry.findUniqueOrThrow({ where: { slug: "revision" } });
    await saveIndustry(testDb(), s, { industryId: revision.id, cvr: "00000003", companyName: "Revisionsfirmaet Bjerre ApS (fiktiv)", industryCode: "692000", industryCodeSystem: "DB25" });
    const sys = await systemsForProfile(testDb(), s);
    const economic = await testDb().system.findUniqueOrThrow({ where: { slug: "e-conomic" } });
    expect(sys?.selected.has(economic.id)).toBe(true); // preselected for the industry
    expect(needsProfile(await getWorkProfile(testDb(), s))).toBe(true);

    await saveSystems(testDb(), s, [economic.id, "not-a-system"]);
    const profile = await getWorkProfile(testDb(), s);
    expect(profile?.selectedSystemIds).toEqual([economic.id]);
    expect(needsProfile(profile)).toBe(false);

    const claude = await recommendationsFor(testDb(), s, "CLAUDE");
    expect(claude?.recommended[0]?.status).toBe("OFFICIAL");
    expect(claude?.recommended.every((r) => r.sourceUrl?.startsWith("https://"))).toBe(true);
    expect(claude?.unavailable.map((u) => u.name)).toContain("e-conomic"); // not in any official catalogue
    expect(claude?.recommended.find((r) => r.name.startsWith("Microsoft 365"))?.useCase).toMatch(/klient/);

    const copilot = await recommendationsFor(testDb(), s, "COPILOT");
    expect(copilot?.recommended.map((r) => r.name)).toContain("Dynamics 365 Business Central");
    expect(claude?.recommended.map((r) => r.name)).not.toContain("Dynamics 365 Business Central");
  });

  it("skipping hides the step; profiles are scoped to the membership", async () => {
    const s = await member();
    await skipProfile(testDb(), s);
    expect(needsProfile(await getWorkProfile(testDb(), s))).toBe(false);
    const other = await member();
    expect(await getWorkProfile(testDb(), { userId: s.userId, organizationId: other.organizationId })).toBeNull();
  });
});

describe("relevance", () => {
  it("only shows connectors with a use case for the industry or a system the learner uses", async () => {
    const [org, user] = await Promise.all([makeOrg("PERSONAL"), makeUser()]);
    await addMember(org.id, user.id, "OWNER");
    const s = { userId: user.id, organizationId: org.id };
    const revision = await testDb().industry.findUniqueOrThrow({ where: { slug: "revision" } });
    await saveIndustry(testDb(), s, { industryId: revision.id });
    await saveSystems(testDb(), s, []);
    const r = await recommendationsFor(testDb(), s, "CHATGPT");
    expect(r?.recommended.map((x) => x.name)).not.toContain("Shopify");
    const shopify = await testDb().system.findUniqueOrThrow({ where: { slug: "shopify" } });
    await saveSystems(testDb(), s, [shopify.id]);
    expect((await recommendationsFor(testDb(), s, "CHATGPT"))?.recommended.map((x) => x.name)).toContain("Shopify");
  });
});

describe("practice connectors in the øvemiljø", () => {
  it("groups the industry's connectors into neutral kinds, with demos and no vendor names", async () => {
    const { practiceConnectorsFor } = await import("@/server/connectors/practice");
    const [org, user] = await Promise.all([makeOrg("PERSONAL"), makeUser()]);
    await addMember(org.id, user.id, "OWNER");
    const s = { userId: user.id, organizationId: org.id };
    expect(await practiceConnectorsFor(testDb(), s)).toBeNull();
    const webshop = await testDb().industry.findUniqueOrThrow({ where: { slug: "webshop" } });
    await saveIndustry(testDb(), s, { industryId: webshop.id });
    const p = await practiceConnectorsFor(testDb(), s);
    expect(p?.industry).toBe("Webshop & e-handel");
    expect(p?.items.map((i) => i.kind)).toContain("shop");
    expect(p?.items.some((i) => i.demo)).toBe(true);
    expect(JSON.stringify(p)).not.toMatch(/chatgpt|openai|copilot|microsoft|claude|anthropic|gemini|google|shopify|hubspot|e-conomic/i);
  });
});
