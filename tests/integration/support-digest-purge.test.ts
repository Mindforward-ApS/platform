import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/server/email/templates";
import { purgeMisc } from "@/server/jobs/retention-purge-misc";
import { buildOwnerDigest, sendOwnerDigest, yesterdayWindow } from "@/server/support/digest";
import { makeSession, testDb } from "./helpers";
import { mailRecorder, makeFixture } from "./support-fixtures";

const db = testDb();
const DAY = 24 * 60 * 60 * 1000;
const env = { AI_GLOBAL_MONTHLY_BUDGET_DKK: 5000, AI_BUDGET_ALERT_PCT: 0.8, OWNER_DIGEST_EMAIL: "marco@example.test", APP_URL: "http://localhost:3000" };

describe("owner digest (docs/08 § 7)", () => {
  it("computes yesterday in Copenhagen time", () => {
    // 07:00 Copenhagen on 14 Oct 2026 (CEST, UTC+2) → window 13 Oct 00:00–14 Oct 00:00 local.
    const w = yesterdayWindow(new Date("2026-10-14T05:00:00Z"));
    expect(w).toMatchObject({ key: "2026-10-13", start: new Date("2026-10-12T22:00:00Z"), end: new Date("2026-10-13T22:00:00Z") });
  });

  it("an empty day still renders: only the AI section, no empty sections", async () => {
    // A far-past day with no activity at all.
    const { vars } = await buildOwnerDigest({ db, env, now: () => new Date("2001-03-02T06:00:00Z") });
    expect(vars.support).toBeNull();
    expect(vars.billing).toBeNull();
    expect(vars.pipeline).toBeNull();
    expect(vars.errors).toBeNull();
    expect(vars.ai.line).toMatch(/I går/);
    const out = await renderTemplate("owner-digest", vars);
    expect(out.text.toLowerCase()).not.toContain("support i går");
    expect(out.text.toLowerCase()).toContain("ai-forbrug");
  });

  it("lists open escalations by SLA (overdue flagged), support stats, errors and AI spend — then sends once", async () => {
    const now = new Date();
    const yesterday = new Date(yesterdayWindow(now).start.getTime() + 2 * 60 * 60 * 1000);
    const fx = await makeFixture("b2c_active_day3");
    const conv = await db.supportConversation.create({ data: { userId: fx.userId, organizationId: fx.orgId, promptVersion: "v1", modelId: "m", createdAt: yesterday } });
    const tag = randomUUID().slice(0, 6);
    await db.escalation.create({ data: { conversationId: conv.id, userId: fx.userId, organizationId: fx.orgId, reason: "SECURITY", priority: "HIGH", summary: `Hacket konto ${tag}`, createdAt: new Date(now.getTime() - 3 * DAY) } });
    await db.escalation.create({ data: { userId: fx.userId, organizationId: fx.orgId, reason: "OTHER", priority: "LOW", summary: `Spørgsmål ${tag}`, createdAt: yesterday } });
    await db.supportMessage.create({ data: { conversationId: conv.id, role: "TOOL", content: "", toolName: "guard", toolResult: { rule: "PROMISE" }, createdAt: yesterday } });
    await db.aiCall.create({ data: { feature: "SUPPORT_AGENT", model: "m", promptKey: "support-agent", promptVersion: "v1", status: "ERROR", createdAt: yesterday } });

    const { vars } = await buildOwnerDigest({ db, env, now: () => now });
    const lines = vars.action?.lines ?? [];
    const sec = lines.find((l) => l.text.includes(`Hacket konto ${tag}`));
    expect(sec?.overdue).toBe(true);
    expect(lines.findIndex((l) => l.text.includes(`Hacket konto ${tag}`))).toBeLessThan(lines.findIndex((l) => l.text.includes(`Spørgsmål ${tag}`)) === -1 ? Infinity : lines.findIndex((l) => l.text.includes(`Spørgsmål ${tag}`)));
    expect(vars.support?.guardHits).toBeGreaterThanOrEqual(1);
    expect(vars.support?.byReason).toMatch(/Andet/);
    expect(vars.errors).toMatch(/AI-fejl/);

    const mail = mailRecorder();
    const r = await sendOwnerDigest({ db, env, now: () => now, sendMail: mail.sendMail });
    expect(r.sent).toBe(true);
    expect(mail.sent).toEqual([{ template: "owner-digest", to: "marco@example.test" }]);
    const esc = await db.escalation.findFirstOrThrow({ where: { summary: `Hacket konto ${tag}` } });
    expect(esc.digestIncludedAt).not.toBeNull();
    const out = await renderTemplate("owner-digest", vars);
    expect(out.text.toLowerCase()).toContain("kræver handling");
    expect(out.text).toContain("OVERSKREDET");
  });

  it("is skipped (not failed) without OWNER_DIGEST_EMAIL", async () => {
    const r = await sendOwnerDigest({ db, env: { ...env, OWNER_DIGEST_EMAIL: undefined }, sendMail: mailRecorder().sendMail });
    expect(r.sent).toBe(false);
  });
});

describe("retention.purge-misc (docs/02 § 5, docs/10 § 1.4)", () => {
  it("purges exactly what is over its limit and keeps the rest", async () => {
    const now = new Date();
    const old = (days: number) => new Date(now.getTime() - days * DAY);
    const track = await db.track.upsert({ where: { key: "CHATGPT" }, create: { key: "CHATGPT", displayName: "ChatGPT", vendorName: "OpenAI", skinKey: "chatgpt" }, update: {} });
    const source = await db.contentSource.create({ data: { key: `src-${randomUUID()}`, trackId: track.id, url: "https://example.test/notes", parserType: "HTML", parserVersion: "1" } });
    const snapOld = await db.sourceSnapshot.create({ data: { sourceId: source.id, fetchedAt: old(91), httpStatus: 200, origin: "FETCH", parserVersion: "1", contentHash: randomUUID(), raw: Buffer.from("x"), entries: [] } });
    const snapNew = await db.sourceSnapshot.create({ data: { sourceId: source.id, fetchedAt: old(89), httpStatus: 200, origin: "FETCH", parserVersion: "1", contentHash: randomUUID(), raw: Buffer.from("y"), entries: [] } });
    const whOld = await db.webhookEvent.create({ data: { provider: "STRIPE", externalId: `evt_${randomUUID()}`, type: "x", payload: { a: 1 }, receivedAt: old(31) } });
    const whNew = await db.webhookEvent.create({ data: { provider: "STRIPE", externalId: `evt_${randomUUID()}`, type: "x", payload: { a: 1 }, receivedAt: old(29) } });
    const aiOld = await db.aiCall.create({ data: { feature: "SANDBOX_CHAT", model: "m", promptKey: "k", promptVersion: "v1", status: "OK", createdAt: old(400) } });
    const aiNew = await db.aiCall.create({ data: { feature: "SANDBOX_CHAT", model: "m", promptKey: "k", promptVersion: "v1", status: "OK", createdAt: old(360) } });
    const verOld = await db.verification.create({ data: { id: randomUUID(), identifier: "x", value: "y", expiresAt: old(1) } });
    const verNew = await db.verification.create({ data: { id: randomUUID(), identifier: "x", value: "y", expiresAt: new Date(now.getTime() + DAY) } });
    const fx = await makeFixture("b2c_active_day3");
    const sessExpired = await db.session.create({ data: { id: randomUUID(), token: randomUUID(), userId: fx.userId, expiresAt: old(1) } });
    const sessLive = await makeSession(fx.userId);
    const sbx = (status: "CLOSED" | "ACTIVE", updatedDaysAgo: number) =>
      db.sandboxSession.create({ data: { userId: fx.userId, organizationId: fx.orgId, trackId: track.id, skinKey: "chatgpt", worldVersion: "1", state: {}, status, expiresAt: now, updatedAt: old(updatedDaysAgo) } });
    const sbxOld = await sbx("CLOSED", 31);
    const sbxRecent = await sbx("CLOSED", 29);
    const sbxActive = await sbx("ACTIVE", 60);
    const convOld = await db.supportConversation.create({ data: { userId: fx.userId, organizationId: fx.orgId, promptVersion: "v1", modelId: "m", lastMessageAt: old(370) } });
    await db.supportMessage.create({ data: { conversationId: convOld.id, role: "USER", content: "gammel" } });
    const escKept = await db.escalation.create({ data: { conversationId: convOld.id, userId: fx.userId, organizationId: fx.orgId, reason: "OTHER", summary: "x" } });
    const convNew = await db.supportConversation.create({ data: { userId: fx.userId, organizationId: fx.orgId, promptVersion: "v1", modelId: "m", lastMessageAt: old(300) } });
    const place = (extra: object, days: number) =>
      db.placementResult.create({ data: { trackId: track.id, testVersion: "t", answers: [], scorePct: 50, level: 1, createdAt: old(days), ...extra } });
    const anonOld = await place({ anonymousTokenHash: randomUUID() }, 91);
    const anonNew = await place({ anonymousTokenHash: randomUUID() }, 89);
    const claimedOld = await place({ userId: fx.userId, claimedAt: old(80) }, 120);

    const r = await purgeMisc(db, now);
    expect(r.sourceSnapshots).toBeGreaterThanOrEqual(1);

    expect((await db.sourceSnapshot.findUniqueOrThrow({ where: { id: snapOld.id } })).raw).toBeNull();
    expect((await db.sourceSnapshot.findUniqueOrThrow({ where: { id: snapNew.id } })).raw).not.toBeNull();
    expect((await db.webhookEvent.findUniqueOrThrow({ where: { id: whOld.id } })).payload).toBeNull();
    expect((await db.webhookEvent.findUniqueOrThrow({ where: { id: whNew.id } })).payload).not.toBeNull();
    expect(await db.aiCall.findUnique({ where: { id: aiOld.id } })).toBeNull();
    expect(await db.aiCall.findUnique({ where: { id: aiNew.id } })).not.toBeNull();
    expect(await db.verification.findUnique({ where: { id: verOld.id } })).toBeNull();
    expect(await db.verification.findUnique({ where: { id: verNew.id } })).not.toBeNull();
    expect(await db.session.findUnique({ where: { id: sessExpired.id } })).toBeNull();
    expect(await db.session.findUnique({ where: { id: sessLive.id } })).not.toBeNull();
    expect(await db.sandboxSession.findUnique({ where: { id: sbxOld.id } })).toBeNull();
    expect(await db.sandboxSession.findUnique({ where: { id: sbxRecent.id } })).not.toBeNull();
    expect(await db.sandboxSession.findUnique({ where: { id: sbxActive.id } })).not.toBeNull();
    expect(await db.supportConversation.findUnique({ where: { id: convOld.id } })).toBeNull();
    expect(await db.supportMessage.count({ where: { conversationId: convOld.id } })).toBe(0);
    expect((await db.escalation.findUniqueOrThrow({ where: { id: escKept.id } })).conversationId).toBeNull();
    expect(await db.supportConversation.findUnique({ where: { id: convNew.id } })).not.toBeNull();
    expect(await db.placementResult.findUnique({ where: { id: anonOld.id } })).toBeNull();
    expect(await db.placementResult.findUnique({ where: { id: anonNew.id } })).not.toBeNull();
    expect(await db.placementResult.findUnique({ where: { id: claimedOld.id } })).not.toBeNull();

    // Idempotent: a second run changes nothing of the above.
    const again = await purgeMisc(db, now);
    expect(again.sourceSnapshots + again.webhookPayloads + again.aiCalls + again.supportConversations + again.placementResults).toBe(0);
  });
});
