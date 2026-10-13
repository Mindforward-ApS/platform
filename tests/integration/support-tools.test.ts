import { describe, expect, it } from "vitest";
import { runSupportTurn, SupportError } from "@/server/support/agent";
import { runSupportTool, type SupportContext } from "@/server/support/tools";
import { createEscalation } from "@/server/support/escalation";
import { testDb } from "./helpers";
import { agentDeps, mailRecorder, makeFixture, makeModuleProgress, scriptedModel } from "./support-fixtures";

function ctxOf(fx: Awaited<ReturnType<typeof makeFixture>>, extra: Partial<SupportContext> = {}): SupportContext {
  return { ...fx.identity, conversationId: null, userMessage: "", ...extra };
}

describe("support tools are user- and org-scoped (docs/08 § 2, § 10)", () => {
  it("every tool refuses a context whose user is not a member of the organization (cross-org)", async () => {
    const a = await makeFixture("b2b_owner");
    const b = await makeFixture("b2b_owner");
    const deps = agentDeps(scriptedModel([]).provider, { sendMail: mailRecorder().sendMail });
    const forged = ctxOf(a, { organizationId: b.orgId });
    const mod = await makeModuleProgress(b.userId, b.orgId);
    for (const [name, input] of [
      ["get_account_overview", {}],
      ["get_billing_portal_link", {}],
      ["resend_invoice_link", {}],
      ["list_my_modules", {}],
      ["reset_module_progress", { moduleId: mod.moduleId, confirm: true }],
      ["get_withdrawal_link", {}],
      ["escalate_to_human", { reason: "OTHER", priority: "LOW", summary: "x" }],
    ] as const) {
      const r = await runSupportTool(deps, forged, name, input);
      expect(r.ok, name).toBe(false);
      expect((r.output as { error: string }).error).toBe("DENIED");
    }
    expect((await testDb().assignment.findUniqueOrThrow({ where: { id: mod.assignmentId } })).status).toBe("PASSED");
  });

  it("enforces roles: portal OWNER only, invoice OWNER/ADMIN, seats only for admins", async () => {
    const deps = agentDeps(scriptedModel([]).provider, { sendMail: mailRecorder().sendMail });
    const owner = await makeFixture("b2b_owner");
    const admin = await makeFixture("b2b_admin");
    const learner = await makeFixture("b2b_learner");
    expect((await runSupportTool(deps, ctxOf(owner), "get_billing_portal_link", {})).ok).toBe(true);
    expect((await runSupportTool(deps, ctxOf(admin), "get_billing_portal_link", {})).ok).toBe(false);
    expect((await runSupportTool(deps, ctxOf(admin), "resend_invoice_link", {})).ok).toBe(true);
    expect((await runSupportTool(deps, ctxOf(learner), "resend_invoice_link", {})).ok).toBe(false);
    const ownerView = await runSupportTool(deps, ctxOf(owner), "get_account_overview", {});
    const learnerView = await runSupportTool(deps, ctxOf(learner), "get_account_overview", {});
    expect(ownerView.output).toHaveProperty("seats");
    expect(learnerView.output).not.toHaveProperty("seats");
    expect(learnerView.output).toMatchObject({ role: "LEARNER", orgType: "BUSINESS" });
  });

  it("list_my_modules returns only the caller's own assignments", async () => {
    const me = await makeFixture("b2c_active_day3");
    const other = await makeFixture("b2c_active_day3");
    const mine = await makeModuleProgress(me.userId, me.orgId);
    await makeModuleProgress(other.userId, other.orgId);
    const deps = agentDeps(scriptedModel([]).provider);
    const r = await runSupportTool(deps, ctxOf(me), "list_my_modules", {});
    expect(r.output).toEqual([expect.objectContaining({ moduleId: mine.moduleId, bestScorePct: 90, passed: true })]);
  });

  it("resend_invoice_link mails only the organization's billing e-mail and rejects a model-supplied address", async () => {
    const mail = mailRecorder();
    const deps = agentDeps(scriptedModel([]).provider, { sendMail: mail.sendMail });
    const admin = await makeFixture("b2b_admin");
    expect((await runSupportTool(deps, ctxOf(admin), "resend_invoice_link", { to: "x@evil.example.test" })).output).toMatchObject({ error: "INVALID_INPUT" });
    const r = await runSupportTool(deps, ctxOf(admin), "resend_invoice_link", {});
    expect(r.output).toMatchObject({ sentTo: admin.billingEmail, status: "betalt" });
    expect(mail.sent).toEqual([{ template: "support-invoice-link", to: admin.billingEmail }]);
    expect(await testDb().auditLog.count({ where: { action: "SUPPORT_INVOICE_LINK_SENT", organizationId: admin.orgId } })).toBe(1);
  });

  it("unknown tools (refund, discount …) are rejected", async () => {
    const fx = await makeFixture("b2c_active_day3");
    const deps = agentDeps(scriptedModel([]).provider);
    for (const name of ["issue_refund", "apply_discount", "change_plan", "get_prompt_texts"]) {
      expect((await runSupportTool(deps, ctxOf(fx), name, {})).output).toEqual({ error: "UNKNOWN_TOOL" });
    }
  });

  it("help tools work for everyone and return links", async () => {
    const fx = await makeFixture("b2b_learner");
    const deps = agentDeps(scriptedModel([]).provider);
    const s = await runSupportTool(deps, ctxOf(fx), "search_help_articles", { query: "opsige" });
    expect((s.output as { url: string }[])[0]?.url).toBe("/hjaelp/opsig-abonnement");
    const a = await runSupportTool(deps, ctxOf(fx), "get_help_article", { slug: "kontakt" });
    expect(a.output).toMatchObject({ slug: "kontakt", url: "/hjaelp/kontakt" });
  });
});

describe("support agent conversations and escalation rows", () => {
  it("a user cannot continue another user's conversation", async () => {
    const a = await makeFixture("b2c_active_day3");
    const b = await makeFixture("b2c_active_day3");
    const deps = agentDeps(scriptedModel([{ text: "Hej" }]).provider);
    const r = await runSupportTurn(deps, a.identity, { message: "Hej" });
    await expect(runSupportTurn(deps, b.identity, { conversationId: r.conversationId, message: "Hej" })).rejects.toBeInstanceOf(SupportError);
  });

  it("escalation creates an OPEN row with reason/priority, dedupes per conversation and mails inbox + user", async () => {
    const fx = await makeFixture("b2c_active_day3");
    const mail = mailRecorder();
    const deps = agentDeps(scriptedModel([]).provider, { sendMail: mail.sendMail });
    const conv = await testDb().supportConversation.create({ data: { userId: fx.userId, organizationId: fx.orgId, promptVersion: "v1", modelId: "m" } });
    const input = { userId: fx.userId, organizationId: fx.orgId, userEmail: fx.identity.userEmail, conversationId: conv.id, reason: "SECURITY" as const, priority: "HIGH" as const, summary: "Mistanke om hacket konto, CPR 010190-1234" };
    const first = await createEscalation(deps, input);
    const second = await createEscalation(deps, input);
    expect(first.created).toBe(true);
    expect(second).toMatchObject({ created: false, escalationId: first.escalationId });
    const row = await testDb().escalation.findUniqueOrThrow({ where: { id: first.escalationId } });
    expect(row).toMatchObject({ status: "OPEN", reason: "SECURITY", priority: "HIGH", userId: fx.userId, organizationId: fx.orgId });
    expect(row.summary).not.toContain("010190");
    expect(first.expectedResponse).toMatch(/4 timer/);
    expect(mail.sent).toEqual([
      { template: "support-escalation", to: "support@example.test" },
      { template: "support-escalation-receipt", to: fx.identity.userEmail },
    ]);
    expect((await testDb().supportConversation.findUniqueOrThrow({ where: { id: conv.id } })).status).toBe("ESCALATED");
  });

  it("three unresolved replies in a row escalate automatically", async () => {
    const fx = await makeFixture("b2c_active_day3");
    const deps = () => agentDeps(scriptedModel([{ text: "Prøv at genindlæse siden." }]).provider, { sendMail: mailRecorder().sendMail });
    const r1 = await runSupportTurn(deps(), fx.identity, { message: "Min side virker ikke" });
    await runSupportTurn(deps(), fx.identity, { conversationId: r1.conversationId, message: "nej, det virker stadig ikke" });
    const r3 = await runSupportTurn(deps(), fx.identity, { conversationId: r1.conversationId, message: "nej" });
    expect(r3.escalationId).not.toBeNull();
    expect(r3.source).toBe("POLICY");
  });

  it("at 100 % of the global budget support falls back to the help center without calling the model", async () => {
    const fx = await makeFixture("b2c_active_day3");
    const model = scriptedModel([{ text: "skal ikke ske" }]);
    // A far-future month isolates this test's BudgetMonth row.
    const now = () => new Date("2031-03-15T10:00:00Z");
    await testDb().budgetMonth.upsert({ where: { scope_month: { scope: "GLOBAL_AI", month: "2031-03" } }, create: { scope: "GLOBAL_AI", month: "2031-03", limitDkk: 100, spentDkk: 100 }, update: { spentDkk: 100 } });
    const r = await runSupportTurn(agentDeps(model.provider, { budgetDkk: 100, now }), fx.identity, { message: "Hvordan opsiger jeg?" });
    expect(model.requests).toHaveLength(0);
    expect(r.source).toBe("FALLBACK");
    expect(r.reply).toContain("/hjaelp/opsig-abonnement");
    expect(await testDb().aiCall.count({ where: { userId: fx.userId, status: "BLOCKED_GLOBAL_CAP" } })).toBe(1);
  });
});
