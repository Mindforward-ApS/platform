import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.schema";
import { decidePublication, type PolicyInput } from "@/server/content-engine/publish";
import { diffLines, moduleLines } from "@/server/content-engine/text-diff";
import { buildIssue, issueLabels } from "@/server/content-engine/github";
import { mapFeatureNames } from "@/server/content-engine/impact";
import { customGptsClassification, customGptsDraft } from "../../fixtures/release-notes/mock-model";

const ok: PolicyInput = {
  moduleType: "NEWS",
  stepTypes: ["READ", "QUIZ"],
  classification: { needsNewSandboxUi: false, affectsCore: false },
  verifyPassed: true,
  autopublishEnabled: true,
  sourceAutoPublishAllowed: true,
  trackActive: true,
  quotaReached: false,
};

describe("publication policy (docs/06 § 8)", () => {
  it("auto-publishes only verified NEWS with READ/QUIZ when every switch allows it", () => {
    expect(decidePublication(ok)).toEqual({ action: "AUTO_PUBLISH" });
  });

  it.each([
    [{ classification: { needsNewSandboxUi: false, affectsCore: true } }, "CORE", true],
    [{ classification: { needsNewSandboxUi: true, affectsCore: false } }, "UI", true],
    [{ moduleType: "CORE" }, "CORE", true],
    [{ stepTypes: ["READ", "CLICK_TASK"] }, "UI", true],
    [{ verifyPassed: false }, "VERIFY_FAILED", false],
    [{ autopublishEnabled: false }, "AUTOPUBLISH_OFF", false],
    [{ sourceAutoPublishAllowed: false }, "SOURCE_NOT_ALLOWED", false],
    [{ trackActive: false }, "TRACK_INACTIVE", false],
    [{ quotaReached: true }, "QUOTA", false],
  ] as const)("%j → IN_REVIEW (%s), issue=%s", (patch, reason, issue) => {
    const d = decidePublication({ ...ok, ...patch } as PolicyInput);
    expect(d.action).toBe("IN_REVIEW");
    if (d.action === "IN_REVIEW") {
      expect(d.reasons).toContain(reason);
      expect(d.createIssue).toBe(issue);
    }
  });
});

describe("review diff", () => {
  it("shows added and removed lines between versions", () => {
    const before = moduleLines({ title: "A", steps: [{ id: "laes-1", type: "READ", title: "T", body: "gammel" }] });
    const after = moduleLines({ title: "A", steps: [{ id: "laes-1", type: "READ", title: "T", body: "ny" }] });
    const diff = diffLines(before, after);
    expect(diff.filter((l) => l.op === "del").map((l) => l.text)).toEqual(["[laes-1]: gammel"]);
    expect(diff.filter((l) => l.op === "add").map((l) => l.text)).toEqual(["[laes-1]: ny"]);
  });
});

describe("GitHub issue body (docs/06 § 9)", () => {
  it("carries the idempotency marker, labels and the draft JSON; region unknown is spelled out", () => {
    const issue = buildIssue({
      changeEventId: "ce_9",
      title: "Custom GPTs lukker",
      track: "CHATGPT",
      entryUrl: "https://help.openai.com/x#y",
      fetchedAt: new Date("2026-10-13T05:15:00Z"),
      snapshotId: "ss_9",
      classification: { ...customGptsClassification, needsNewSandboxUi: true },
      entryText: "Starting December 11, 2026 …",
      affectedModules: [],
      moduleVersionId: "mv_1",
      moduleJson: customGptsDraft,
    });
    expect(issue.body).toContain("<!-- greb-change-event:ce_9 -->");
    expect(issue.body).toContain("tjek tilgængelighed hos jer");
    expect(issue.body).toContain("Kladde-JSON");
    expect(issue.labels).toEqual(["content-engine", "track:CHATGPT", "needs-sandbox-ui", "deprecation"]);
    expect(issueLabels({ track: "COPILOT", classification: { ...customGptsClassification, changeType: "NEW_FEATURE", deprecations: [] } })).toEqual(["content-engine", "track:COPILOT"]);
  });
});

describe("feature registry mapping", () => {
  it("maps aliases per track and reports unknown names", () => {
    expect(mapFeatureNames(["custom GPTs", "GPT Builder", "Gizmo"], "CHATGPT")).toEqual({ ids: ["chatgpt.custom-gpts"], unknown: ["Gizmo"] });
    expect(mapFeatureNames(["Skills"], "CLAUDE").ids).toEqual(["claude.skills"]);
  });
});

describe("env", () => {
  const base = { APP_URL: "http://localhost:3000", DATABASE_URL: "postgresql://x@localhost/db", BETTER_AUTH_SECRET: "x".repeat(32) };
  it("rejects the same model for draft and verify", () => {
    expect(() => parseServerEnv({ ...base, CONTENT_DRAFT_MODEL: "m", CONTENT_VERIFY_MODEL: "m" })).toThrow(/CONTENT_VERIFY_MODEL/);
    expect(() => parseServerEnv({ ...base, CONTENT_DRAFT_MODEL: "a", CONTENT_VERIFY_MODEL: "b", CONTENT_PIPELINE_ENABLED: "false" })).not.toThrow();
  });
});
