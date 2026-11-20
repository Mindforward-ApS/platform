import { z } from "zod";
import { daContent } from "@/lib/i18n/da-content";
import type { ModuleContent } from "@/lib/schemas/module";
import type { CallContentModel, ContentModelUsage } from "./model";
import type { Classification } from "./prompts/content-classify.v1";
import { contentDraftV1, draftOutputSchema, type DraftClaim, type DraftOutput } from "./prompts/content-draft.v1";

// Draft (docs/06 § 6): the model writes READ/QUIZ text with claims; code sets everything the model must not
// decide — ids, tracks, tier, featureRefs, attribution (CC BY 4.0), autoUpdatedAt, sourceRef ids/urls.

export interface DraftContext {
  changeEventId: string;
  snapshotId: string;
  track: "CHATGPT" | "COPILOT" | "CLAUDE" | "GEMINI";
  moduleSlug: string;
  version: number;
  entry: { title: string; text: string; url: string; date: string | null };
  source: { title: string; url: string; attribution: string | null };
  classification: Classification;
  featureRefs: string[];
  /** yyyy-mm-dd (Europe/Copenhagen) — "Automatisk opdateret [dato]". */
  today: string;
}

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

export function regionInstruction(c: Classification): string {
  if (c.region.status === "known") return `Kilden siger: ${c.region.values.join(", ")}. Skriv kun det, kilden siger.`;
  return `Kilden oplyser ikke region. Skriv præcis: '${daContent.generated.regionUnknown}' Skriv ALDRIG at funktionen er tilgængelig i Danmark eller EU.`;
}

export function plansInstruction(c: Classification): string {
  if (c.plans.status === "known" && c.plans.values.length > 0) return `Kilden nævner: ${c.plans.values.join(", ")}. Nævn kun disse abonnementer.`;
  return "Kilden oplyser ikke abonnement. Nævn ikke abonnementer.";
}

/** LLMs are poor at character offsets: when the quote is an exact substring, code corrects the offsets. */
function repairOffsets(claim: DraftClaim, text: string): DraftClaim {
  if (claim.kind !== "FACT" || !claim.quote) return claim;
  if (claim.charStart !== null && claim.charEnd !== null && text.slice(claim.charStart, claim.charEnd) === claim.quote) return claim;
  const idx = text.indexOf(claim.quote);
  return idx >= 0 ? { ...claim, charStart: idx, charEnd: idx + claim.quote.length } : claim;
}

function toClaim(c: DraftClaim, ctx: DraftContext) {
  const repaired = repairOffsets(c, ctx.entry.text);
  // A quote that is not in the source keeps its (wrong) offsets so verify reports QUOTE_MISMATCH.
  const hasRef = repaired.kind === "FACT" && Boolean(repaired.quote);
  return {
    text: repaired.text,
    kind: repaired.kind,
    ...(hasRef
      ? { sourceRef: { changeEventId: ctx.changeEventId, snapshotId: ctx.snapshotId, url: ctx.entry.url, quote: repaired.quote!, charStart: repaired.charStart ?? 0, charEnd: repaired.charEnd ?? 0 } }
      : {}),
  };
}

/** Full module JSON. Not validated here — verify.ts decides (schema errors are a verification failure). */
export function assembleModule(ctx: DraftContext, out: DraftOutput): ModuleContent {
  const regionKnown = ctx.classification.region.status === "known";
  const sentence = daContent.generated.regionUnknown;
  const reads = out.reads.map((r, i) => {
    const claims = r.claims.map((c) => toClaim(c, ctx));
    let body = r.body.trim();
    if (!regionKnown && i === 0 && !out.reads.some((x) => x.body.includes(sentence))) {
      body = `${body}\n\n${sentence}`;
      claims.push({ text: sentence, kind: "GUIDANCE" });
    }
    return { id: `laes-${i + 1}`, type: "READ" as const, title: r.title, points: 0 as const, body, claims };
  });
  const quizzes = out.quizzes.map((q, i) => ({
    id: `quiz-${i + 1}`,
    type: "QUIZ" as const,
    title: q.title,
    points: 10,
    hints: [
      { level: 1 as const, text: q.hints[0]! },
      { level: 2 as const, text: q.hints[1]! },
      { level: 3 as const, text: q.hints[2]! },
    ] as [{ level: 1; text: string }, { level: 2; text: string }, { level: 3; text: string }],
    question: q.question,
    multiSelect: false,
    shuffle: true,
    options: q.options.map((o, j) => ({ id: `svar-${j + 1}`, text: o.text, correct: o.correct, feedback: o.feedback })),
    explanation: q.explanation,
    ...(q.claims && q.claims.length > 0 ? { claims: q.claims.map((c) => toClaim(c, ctx)) } : {}),
  }));

  const sourceUrl = ctx.entry.url;
  return {
    schemaVersion: 1,
    id: ctx.moduleSlug,
    version: ctx.version,
    locale: "da-DK",
    title: out.title,
    summary: out.summary,
    level: 1,
    type: "NEWS",
    format: "STANDARD",
    tracks: [ctx.track],
    ...(ctx.track === "COPILOT" ? { requiresTier: ctx.classification.requiresTier ?? "unknown" } : {}),
    concepts: [...new Set(ctx.classification.concepts)],
    ...(ctx.featureRefs.length > 0 ? { featureRefs: ctx.featureRefs } : {}),
    minutes: 5,
    objectives: out.objectives,
    passThreshold: 0.8,
    requiresVerification: true,
    verifiedAt: null,
    sources: [{ id: "kilde-1", url: sourceUrl, title: fill(daContent.generated.sourceTitle, { title: ctx.entry.title || ctx.source.title }).slice(0, 200), retrievedAt: ctx.today }],
    attribution: ctx.source.attribution ? fill(daContent.generated.attribution, { attribution: ctx.source.attribution, url: ctx.source.url.replace(/\?accept=text\/markdown$/, "") }).slice(0, 400) : null,
    autoUpdatedAt: ctx.today,
    steps: [...reads, ...quizzes],
  } as ModuleContent;
}

export interface DraftResult {
  ok: boolean;
  content?: ModuleContent;
  error?: string;
  modelId: string;
  usage?: ContentModelUsage;
}

export async function draftModule(call: CallContentModel, ctx: DraftContext, feedback?: string): Promise<DraftResult> {
  const p = contentDraftV1;
  const { $schema: _s, ...outputSchema } = z.toJSONSchema(p.outputSchema) as Record<string, unknown>;
  const res = await call("CONTENT_DRAFT", {
    promptKey: p.key,
    promptVersion: p.version,
    system: p.system,
    user: p.buildUser({
      classification: ctx.classification,
      title: ctx.entry.title,
      text: ctx.entry.text,
      track: ctx.track,
      requiresTier: ctx.track === "COPILOT" ? (ctx.classification.requiresTier ?? "unknown") : null,
      regionInstruction: regionInstruction(ctx.classification),
      plansInstruction: plansInstruction(ctx.classification),
      feedback,
    }),
    toolName: p.toolName,
    outputSchema,
    maxTokens: p.maxTokens,
    temperature: p.temperature,
  });
  const parsed = draftOutputSchema.safeParse(res.output);
  if (!parsed.success) return { ok: false, error: `invalid draft output: ${parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, modelId: res.modelId, usage: res.usage };
  return { ok: true, content: assembleModule(ctx, parsed.data), modelId: res.modelId, usage: res.usage };
}
