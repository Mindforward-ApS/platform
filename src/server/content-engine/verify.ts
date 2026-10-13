import { z } from "zod";
import { daContent } from "@/lib/i18n/da-content";
import { countWords, moduleSchema, type ModuleContent } from "@/lib/schemas/module";
import { findBannedClaims } from "./banned-claims";
import { validateModuleJsonSchema } from "./json-schema";
import type { CallContentModel, ContentModelUsage } from "./model";
import { contentVerifyV1, verifyOutputSchema } from "./prompts/content-verify.v1";

// Verify (docs/06 § 7): schema → deterministic checks (no LLM) → independent verifier model. Stops at the first
// failing stage; everything is stored as the verify report on ModuleVersion + PipelineRun.

export const NGRAM_LIMIT = 12;

export interface VerifyContext {
  changeEventId: string;
  snapshotId: string;
  /** The snapshot entry text the quotes must come from. */
  sourceText: string;
  /** Hosts sourceRef urls and links may point at (ContentSource hosts). */
  sourceHosts: string[];
  appHost: string;
  regionKnown: boolean;
}

export interface CheckError {
  code: string;
  message: string;
}

export interface ClaimReport {
  id: string;
  where: string;
  text: string;
  kind: "FACT" | "GUIDANCE";
  quote: string | null;
  verdict?: "SUPPORTED" | "PARTIAL" | "NOT_SUPPORTED" | "CONTRADICTED";
  reason?: string;
}

export interface VerifyReport {
  passed: boolean;
  stage: "schema" | "deterministic" | "model" | "passed";
  schemaErrors: string[];
  errors: CheckError[];
  claims: ClaimReport[];
  language?: { status: "PASS" | "FIX_NEEDED"; fixes: string[] };
  verifierModel?: string;
  promptVersion: string;
}

type Claim = NonNullable<Extract<ModuleContent["steps"][number], { type: "READ" }>["claims"]>[number];

/** Every claim with a stable id (c1, c2 …) and where it sits. */
export function collectClaims(m: ModuleContent): (Claim & { id: string; where: string })[] {
  const out: (Claim & { id: string; where: string })[] = [];
  for (const s of m.steps) {
    if ((s.type === "READ" || s.type === "QUIZ") && s.claims) for (const c of s.claims) out.push({ ...c, id: `c${out.length + 1}`, where: s.id });
  }
  return out;
}

/** Learner-visible text (claims' quotes are admin-only and excluded). */
export function visibleTexts(m: ModuleContent): { where: string; text: string }[] {
  const t: { where: string; text: string }[] = [
    { where: "title", text: m.title },
    { where: "summary", text: m.summary },
    ...m.objectives.map((o, i) => ({ where: `objectives.${i}`, text: o })),
  ];
  for (const s of m.steps) {
    t.push({ where: `${s.id}.title`, text: s.title });
    if (s.type === "READ") t.push({ where: `${s.id}.body`, text: s.body });
    if (s.type === "QUIZ") {
      t.push({ where: `${s.id}.question`, text: s.question }, { where: `${s.id}.explanation`, text: s.explanation });
      s.options.forEach((o) => t.push({ where: `${s.id}.${o.id}`, text: o.text }, { where: `${s.id}.${o.id}.feedback`, text: o.feedback }));
      s.hints.forEach((h) => t.push({ where: `${s.id}.hint${h.level}`, text: h.text }));
    }
    if ((s.type === "READ" || s.type === "QUIZ") && s.claims) s.claims.forEach((c, i) => t.push({ where: `${s.id}.claims.${i}`, text: c.text }));
  }
  return t;
}

const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** Longest run of consecutive words shared with the source (≥ NGRAM_LIMIT = copied). */
export function sharesNgram(text: string, source: string, n = NGRAM_LIMIT): boolean {
  const src = words(source);
  if (src.length < n) return false;
  const grams = new Set<string>();
  for (let i = 0; i + n <= src.length; i++) grams.add(src.slice(i, i + n).join(" "));
  const w = words(text);
  for (let i = 0; i + n <= w.length; i++) if (grams.has(w.slice(i, i + n).join(" "))) return true;
  return false;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
};

export function schemaCheck(content: unknown): { module?: ModuleContent; errors: string[] } {
  const jsonErrors = validateModuleJsonSchema(content).map((e) => `[json-schema] ${e}`);
  const parsed = moduleSchema.safeParse(content);
  const zodErrors = parsed.success ? [] : parsed.error.issues.map((i) => `[zod] ${i.path.join(".")}: ${i.message}`);
  const errors = [...jsonErrors, ...zodErrors];
  if (parsed.success && parsed.data.steps.some((s) => s.type !== "READ" && s.type !== "QUIZ")) errors.push("[policy] AUTO modules may only contain READ and QUIZ");
  if (parsed.success && parsed.data.type !== "NEWS") errors.push("[policy] the engine only drafts NEWS modules");
  return { module: parsed.success && errors.length === 0 ? parsed.data : undefined, errors };
}

export function deterministicChecks(m: ModuleContent, ctx: VerifyContext): CheckError[] {
  const errors: CheckError[] = [];
  const err = (code: string, message: string) => errors.push({ code, message });
  const claims = collectClaims(m);

  for (const c of claims) {
    if (c.kind !== "FACT") continue;
    const ref = c.sourceRef;
    if (!ref) {
      err("CLAIM_WITHOUT_SOURCE", `${c.id} (${c.where}) has no sourceRef`);
      continue;
    }
    if (ctx.sourceText.slice(ref.charStart, ref.charEnd) !== ref.quote) err("QUOTE_MISMATCH", `${c.id}: quote is not the source text at ${ref.charStart}–${ref.charEnd}`);
    if (ref.changeEventId !== ctx.changeEventId || ref.snapshotId !== ctx.snapshotId) err("SOURCE_MISMATCH", `${c.id}: sourceRef does not belong to this change event/snapshot`);
    if (!ctx.sourceHosts.includes(hostOf(ref.url))) err("SOURCE_HOST", `${c.id}: sourceRef url host ${hostOf(ref.url)} is not the source host`);
  }

  for (const s of m.steps) {
    if (s.type === "READ" && countWords(s.body) > 120) err("READ_TOO_LONG", `${s.id}: more than 120 words`);
    if (s.type === "QUIZ") {
      if (s.options.filter((o) => o.correct).length !== 1) err("QUIZ_CORRECT", `${s.id}: exactly one correct option required`);
      if (s.options.length < 3 || s.options.length > 4) err("QUIZ_OPTIONS", `${s.id}: 3–4 options required`);
      if (new Set(s.options.map((o) => o.text.trim().toLowerCase())).size !== s.options.length) err("QUIZ_DUPLICATE", `${s.id}: duplicate options`);
    }
  }

  const texts = visibleTexts(m);
  for (const t of texts) if (sharesNgram(t.text, ctx.sourceText)) err("COPIED_TEXT", `${t.where}: shares ${NGRAM_LIMIT}+ consecutive words with the source`);

  const all = texts.map((t) => t.text).join("\n");
  if (!ctx.regionKnown) {
    if (!all.includes(daContent.generated.regionUnknown)) err("REGION_SENTENCE", "region unknown: the fixed sentence is missing");
    const regionWords = all.replace(daContent.generated.regionUnknown, "").match(/(?<![\p{L}])(Danmark|EU|Europa|EØS)(?![\p{L}])/gu);
    if (regionWords) err("REGION_WORDS", `region unknown but text mentions ${[...new Set(regionWords)].join(", ")}`);
  }

  const allowedHosts = new Set([...ctx.sourceHosts, ctx.appHost]);
  for (const url of all.match(/https?:\/\/[^\s)\]]+/g) ?? []) if (!allowedHosts.has(hostOf(url))) err("LINK_HOST", `link to ${hostOf(url)} is not allowed`);

  const freeBacked = claims.some((c) => c.kind === "FACT" && /gratis/i.test(c.text) && /\bfree\b|gratis|no (additional )?cost|without a .*license/i.test(c.sourceRef?.quote ?? ""));
  for (const hit of findBannedClaims(all, { regionKnown: ctx.regionKnown, freeBacked })) err("BANNED_CLAIM", `${hit.rule}: "${hit.match}"`);
  return errors;
}

export interface VerifyResult {
  report: VerifyReport;
  usage?: ContentModelUsage;
}

export async function verifyModule(call: CallContentModel, content: unknown, ctx: VerifyContext, draftModelId: string): Promise<VerifyResult> {
  const p = contentVerifyV1;
  const base = { schemaErrors: [] as string[], errors: [] as CheckError[], claims: [] as ClaimReport[], promptVersion: `${p.key}.${p.version}` };
  const { module, errors: schemaErrors } = schemaCheck(content);
  if (!module) {
    // Still list claims without a source so the admin sees why (and the "missing source → rejected" rule is visible).
    const missing = schemaErrors.some((e) => e.includes("FACT claims need a sourceRef")) ? [{ code: "CLAIM_WITHOUT_SOURCE", message: "a FACT claim has no sourceRef" }] : [];
    return { report: { ...base, passed: false, stage: "schema", schemaErrors, errors: missing } };
  }
  const claims: ClaimReport[] = collectClaims(module).map((c) => ({ id: c.id, where: c.where, text: c.text, kind: c.kind, quote: c.sourceRef?.quote ?? null }));
  const errors = deterministicChecks(module, ctx);
  if (errors.length > 0) return { report: { ...base, passed: false, stage: "deterministic", errors, claims } };

  const { $schema: _s, ...outputSchema } = z.toJSONSchema(p.outputSchema) as Record<string, unknown>;
  const res = await call("CONTENT_VERIFY", {
    promptKey: p.key,
    promptVersion: p.version,
    system: p.system,
    user: p.buildUser({ sourceText: ctx.sourceText, claims: claims.map((c) => ({ id: c.id, text: c.text, quote: c.quote })), moduleText: visibleTexts(module).map((t) => t.text).join("\n") }),
    toolName: p.toolName,
    outputSchema,
    maxTokens: p.maxTokens,
    temperature: p.temperature,
  });
  const fail = (code: string, message: string, extra: Partial<VerifyReport> = {}): VerifyResult => ({
    report: { ...base, passed: false, stage: "model", errors: [{ code, message }], claims, verifierModel: res.modelId, ...extra },
    usage: res.usage,
  });
  if (res.modelId === draftModelId) return fail("VERIFIER_NOT_INDEPENDENT", `verifier model ${res.modelId} is the draft model`);
  const parsed = verifyOutputSchema.safeParse(res.output);
  if (!parsed.success) return fail("VERIFIER_OUTPUT", "verifier output did not match the schema");

  const verdicts = new Map(parsed.data.claims.map((c) => [c.id, c]));
  const judged = claims.map((c) => ({ ...c, verdict: verdicts.get(c.id)?.verdict, reason: verdicts.get(c.id)?.reason }));
  const modelErrors: CheckError[] = [];
  for (const c of judged) {
    if (c.kind !== "FACT") continue;
    if (!c.verdict) modelErrors.push({ code: "CLAIM_NOT_JUDGED", message: `${c.id} was not judged` });
    else if (c.verdict !== "SUPPORTED") modelErrors.push({ code: `CLAIM_${c.verdict}`, message: `${c.id}: ${c.reason ?? ""}` });
  }
  if (parsed.data.language.status !== "PASS") modelErrors.push({ code: "LANGUAGE_FIX_NEEDED", message: parsed.data.language.fixes.join(" · ") });
  const passed = modelErrors.length === 0;
  return {
    report: { ...base, passed, stage: passed ? "passed" : "model", errors: modelErrors, claims: judged, language: parsed.data.language, verifierModel: res.modelId },
    usage: res.usage,
  };
}

/** Feedback for the single automatic re-draft. */
export function feedbackFrom(report: VerifyReport): string {
  return [...report.schemaErrors, ...report.errors.map((e) => `${e.code}: ${e.message}`), ...(report.language?.fixes ?? [])].slice(0, 30).join("\n");
}
