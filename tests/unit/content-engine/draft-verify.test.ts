import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateModule } from "../../../scripts/content-validate";
import { findBannedClaims } from "@/server/content-engine/banned-claims";
import { enforceEvidence, routeClassification } from "@/server/content-engine/classify";
import { assertIndependentVerifier, loadContentConfig } from "@/server/content-engine/config";
import { assembleModule, draftModule, type DraftContext } from "@/server/content-engine/draft";
import { parseSource } from "@/server/content-engine/parsers";
import { sourceConfig } from "@/server/content-engine/sources";
import { deterministicChecks, sharesNgram, verifyModule, type VerifyContext } from "@/server/content-engine/verify";
import { daContent } from "@/lib/i18n/da-content";
import { moduleSchema, type ModuleContent } from "@/lib/schemas/module";
import { customGptsClassification, customGptsDraft, mockContentModel, supportedVerify } from "../../fixtures/release-notes/mock-model";

const cfg = sourceConfig("openai-chatgpt-rn")!;
const entry = parseSource("HTML", readFileSync("tests/fixtures/release-notes/chatgpt-rn-v2.html", "utf8"), cfg.parser, cfg.url).find((e) => e.entryKey === "id-h_custom-gpts-retirement")!;

const ctx: DraftContext = {
  changeEventId: "ce_1",
  snapshotId: "ss_1",
  track: "CHATGPT",
  moduleSlug: "news-chatgpt-20261013-abcd1234",
  version: 1,
  entry,
  source: { title: cfg.title, url: cfg.url, attribution: null },
  classification: customGptsClassification,
  featureRefs: ["chatgpt.custom-gpts"],
  today: "2026-10-13",
};
const vctx: VerifyContext = { changeEventId: "ce_1", snapshotId: "ss_1", sourceText: entry.text, sourceHosts: ["help.openai.com"], appHost: "mindforward.dk", regionKnown: false };
const clone = (m: ModuleContent) => structuredClone(m) as ModuleContent;

describe("draft assembly", () => {
  const m = assembleModule(ctx, customGptsDraft);

  it("produces a NEWS module that passes moduleSchema AND the JSON Schema of scripts/content-validate.ts", () => {
    expect(moduleSchema.safeParse(m).success).toBe(true);
    expect(validateModule(m, undefined, "draft")).toEqual([]);
    expect(m.steps.map((s) => s.type)).toEqual(["READ", "READ", "QUIZ", "QUIZ"]);
  });

  it("sets code-owned fields: featureRefs, autoUpdatedAt, source link, sourceRef ids — and repairs offsets for exact quotes", () => {
    expect(m).toMatchObject({ type: "NEWS", tracks: ["CHATGPT"], featureRefs: ["chatgpt.custom-gpts"], autoUpdatedAt: "2026-10-13", attribution: null });
    expect(m.sources?.[0]?.url).toBe(entry.url);
    const read = m.steps[0] as Extract<ModuleContent["steps"][number], { type: "READ" }>;
    for (const c of read.claims!.filter((c) => c.kind === "FACT")) {
      expect(c.sourceRef).toMatchObject({ changeEventId: "ce_1", snapshotId: "ss_1", url: entry.url });
      expect(entry.text.slice(c.sourceRef!.charStart, c.sourceRef!.charEnd)).toBe(c.sourceRef!.quote);
    }
  });

  it("inserts the fixed region sentence when the source states no region", () => {
    expect((m.steps[0] as { body: string }).body).toContain(daContent.generated.regionUnknown);
  });

  it("sets the CC BY 4.0 attribution from ContentSource.attribution, not from the model", () => {
    const ms = assembleModule({ ...ctx, track: "COPILOT", source: { title: "x", url: "https://learn.microsoft.com/en-us/copilot/microsoft-365/release-notes?accept=text/markdown", attribution: sourceConfig("ms-learn-copilot-rn")!.attribution } }, customGptsDraft);
    expect(ms.attribution).toContain("CC BY 4.0");
    expect(ms.attribution).toContain("Oversat og omskrevet af Mindforward");
    expect(ms.requiresTier).toBe("unknown");
  });
});

describe("verify — deterministic", () => {
  const good = assembleModule(ctx, customGptsDraft);

  it("passes the good draft", () => {
    expect(deterministicChecks(good, vctx)).toEqual([]);
  });

  it("rejects a FACT claim without source", async () => {
    const draft = structuredClone(customGptsDraft);
    draft.reads[0]!.claims[0] = { ...draft.reads[0]!.claims[0]!, quote: null };
    const { call } = mockContentModel();
    const r = await verifyModule(call, assembleModule(ctx, draft), vctx, "mock-small");
    expect(r.report).toMatchObject({ passed: false, stage: "schema" });
    expect(r.report.errors.map((e) => e.code)).toContain("CLAIM_WITHOUT_SOURCE");
  });

  it("rejects a quote that is not in the source", () => {
    const draft = structuredClone(customGptsDraft);
    draft.reads[0]!.claims[0] = { ...draft.reads[0]!.claims[0]!, quote: "Custom GPTs are available in the EU." };
    expect(deterministicChecks(assembleModule(ctx, draft), vctx).map((e) => e.code)).toContain("QUOTE_MISMATCH");
  });

  it("rejects invented EU availability, copied sentences, banned claims and foreign links", () => {
    const m = clone(good);
    (m.steps[1] as { body: string }).body = "Funktionen er tilgængelig i Danmark. Starting December 11, 2026, custom GPTs will no longer be available in ChatGPT. Se https://evil.example/x. Det er lovkrav og der kan komme bøder.";
    const codes = deterministicChecks(m, vctx).map((e) => e.code);
    expect(codes).toEqual(expect.arrayContaining(["REGION_WORDS", "COPIED_TEXT", "LINK_HOST", "BANNED_CLAIM"]));
  });

  it("requires exactly one correct answer and 3–4 options", () => {
    const m = clone(good);
    const q = m.steps[2] as Extract<ModuleContent["steps"][number], { type: "QUIZ" }>;
    q.options = q.options.slice(0, 2);
    expect(deterministicChecks(m, vctx).map((e) => e.code)).toContain("QUIZ_OPTIONS");
  });
});

describe("verify — independent model", () => {
  it("passes when every FACT claim is SUPPORTED and language is PASS", async () => {
    const { call } = mockContentModel();
    const r = await verifyModule(call, assembleModule(ctx, customGptsDraft), vctx, "mock-small");
    expect(r.report).toMatchObject({ passed: true, stage: "passed", verifierModel: "mock-large" });
  });

  it("fails on a PARTIAL/NOT_SUPPORTED claim", async () => {
    const { call } = mockContentModel({ verify: (ids) => ({ ...supportedVerify(ids), claims: ids.map((id, i) => ({ id, verdict: i === 0 ? "NOT_SUPPORTED" : "SUPPORTED", reason: "x" })) }) });
    const r = await verifyModule(call, assembleModule(ctx, customGptsDraft), vctx, "mock-small");
    expect(r.report.passed).toBe(false);
    expect(r.report.errors[0]!.code).toBe("CLAIM_NOT_SUPPORTED");
  });

  it("fails when the verifier is the draft model", async () => {
    const { call } = mockContentModel({ verifyModel: "same" });
    const r = await verifyModule(call, assembleModule(ctx, customGptsDraft), vctx, "same");
    expect(r.report.errors[0]!.code).toBe("VERIFIER_NOT_INDEPENDENT");
  });

  it("config check: CONTENT_VERIFY_MODEL must differ from CONTENT_DRAFT_MODEL", () => {
    expect(() => assertIndependentVerifier(loadContentConfig({ CONTENT_DRAFT_MODEL: "a", CONTENT_VERIFY_MODEL: "a" }))).toThrow(/differ/);
    expect(() => assertIndependentVerifier(loadContentConfig({}))).toThrow(/must be set/);
    expect(() => assertIndependentVerifier(loadContentConfig({ CONTENT_DRAFT_MODEL: "a", CONTENT_VERIFY_MODEL: "b" }))).not.toThrow();
  });

  it("draftModule Zod-validates the model output", async () => {
    const { call } = mockContentModel({ draft: { ...customGptsDraft, quizzes: [] } });
    expect(await draftModule(call, ctx)).toMatchObject({ ok: false });
  });
});

describe("classify rules", () => {
  it("forces region to unknown without an exact evidence quote", () => {
    const c = enforceEvidence({ ...customGptsClassification, region: { status: "known", values: ["EU"], evidenceQuote: "Available in the EU" } }, entry.text, "CHATGPT");
    expect(c.region.status).toBe("unknown");
  });

  it("routes deprecations to impact analysis regardless of relevance, otherwise by threshold", () => {
    expect(routeClassification({ ...customGptsClassification, relevance: 0.1 }, 0.6)).toBe("IMPACT_AND_DRAFT");
    const plain = { ...customGptsClassification, changeType: "NEW_FEATURE" as const, deprecations: [] };
    expect(routeClassification(plain, 0.6)).toBe("DRAFT");
    expect(routeClassification({ ...plain, relevance: 0.5 }, 0.6)).toBe("SKIP");
    expect(routeClassification({ ...plain, businessFacing: false }, 0.6)).toBe("SKIP");
  });
});

describe("banned claims", () => {
  it("catches certification, legal requirements, fines and vendor endorsement", () => {
    const rules = findBannedClaims("Kurset giver certificering. Det er et lovkrav. Undgå bøder. Godkendt af Microsoft. Officiel partner.", { regionKnown: false, freeBacked: false }).map((h) => h.rule);
    expect(rules).toEqual(expect.arrayContaining(["certification", "legal-requirement", "fines", "vendor-endorsement"]));
    expect(findBannedClaims("Spørg jeres IT-ansvarlige.", { regionKnown: false, freeBacked: false })).toEqual([]);
  });

  it("n-gram check finds 12 shared consecutive words", () => {
    expect(sharesNgram("a b c d e f g h i j k l", "x a b c d e f g h i j k l y")).toBe(true);
    expect(sharesNgram("a b c d e f g h i j k", "a b c d e f g h i j k l")).toBe(false);
  });
});
