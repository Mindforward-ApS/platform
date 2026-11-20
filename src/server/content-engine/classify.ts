import { z } from "zod";
import type { CallContentModel, ContentModelUsage } from "./model";
import { classificationSchema, contentClassifyV1, type Classification } from "./prompts/content-classify.v1";

// Classify (docs/06 § 5). The region rule is enforced in code: "known" requires an evidence quote that is an
// exact substring of the entry text; otherwise it is forced to "unknown". The engine never guesses EU availability.

export const MAX_CLASSIFY_INPUT_CHARS = 24_000; // ≈ 6.000 tokens

export function enforceEvidence(c: Classification, text: string, track: string): Classification {
  const regionOk = c.region.status === "known" && !!c.region.evidenceQuote && text.includes(c.region.evidenceQuote);
  const plansOk = c.plans.status === "known" && (!c.plans.evidenceQuote || text.includes(c.plans.evidenceQuote));
  return {
    ...c,
    region: regionOk ? c.region : { status: "unknown", values: [], evidenceQuote: null },
    plans: plansOk ? c.plans : { status: "unknown", values: [], evidenceQuote: null },
    requiresTier: track === "COPILOT" ? (c.requiresTier ?? "unknown") : null,
  };
}

export type Route = "IMPACT_AND_DRAFT" | "DRAFT" | "SKIP";

/** docs/06 § 5 routing: deprecations always get impact analysis (and a NEWS draft); otherwise relevance gate. */
export function routeClassification(c: Classification, threshold: number): Route {
  if (c.changeType === "DEPRECATION" || c.changeType === "RETIREMENT" || c.deprecations.length > 0) return "IMPACT_AND_DRAFT";
  if (c.relevance >= threshold && c.businessFacing) return "DRAFT";
  return "SKIP";
}

export interface ClassifyResult {
  ok: boolean;
  classification?: Classification;
  error?: string;
  modelId: string;
  usage?: ContentModelUsage;
}

export async function classifyEntry(
  call: CallContentModel,
  input: { sourceKey: string; track: string; url: string; date: string | null; title: string; text: string },
): Promise<ClassifyResult> {
  const p = contentClassifyV1;
  const { $schema: _s, ...outputSchema } = z.toJSONSchema(p.outputSchema) as Record<string, unknown>;
  const res = await call("CONTENT_CLASSIFY", {
    promptKey: p.key,
    promptVersion: p.version,
    system: p.system,
    user: p.buildUser({ ...input, text: input.text.slice(0, MAX_CLASSIFY_INPUT_CHARS) }),
    toolName: p.toolName,
    outputSchema,
    maxTokens: p.maxTokens,
    temperature: p.temperature,
  });
  const parsed = classificationSchema.safeParse(res.output);
  if (!parsed.success) return { ok: false, error: "invalid classification output", modelId: res.modelId, usage: res.usage };
  return { ok: true, classification: enforceEvidence(parsed.data, input.text, input.track), modelId: res.modelId, usage: res.usage };
}
