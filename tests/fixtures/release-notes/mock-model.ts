import type { CallContentModel, ContentFeature, ContentModelRequest } from "@/server/content-engine/model";
import type { Classification } from "@/server/content-engine/prompts/content-classify.v1";
import type { DraftOutput } from "@/server/content-engine/prompts/content-draft.v1";
import type { VerifyOutput } from "@/server/content-engine/prompts/content-verify.v1";

// Mocked content model for tests (no LLM, no network). Outputs match the custom-GPTs entry in chatgpt-rn-v2.html.

export const customGptsClassification: Classification = {
  relevance: 0.9,
  businessFacing: true,
  changeType: "RETIREMENT",
  plans: { status: "known", values: ["Plus", "Pro", "Business", "Enterprise"], evidenceQuote: "This change applies to Plus, Pro, Business and Enterprise plans." },
  requiresTier: null,
  region: { status: "unknown", values: [], evidenceQuote: null },
  features: ["custom GPTs", "Skills", "Plugins"],
  concepts: ["ASSISTANTS"],
  effectiveDate: "2026-12-11",
  deprecations: [{ feature: "custom GPTs", effectiveDate: "2026-12-11", replacement: "Skills and Plugins", evidenceQuote: "Starting December 11, 2026, custom GPTs will no longer be available in ChatGPT." }],
  needsNewSandboxUi: false,
  affectsCore: false,
  summaryDa: "Custom GPTs lukker 11. december 2026 og erstattes af Skills og Plugins.",
};

export const customGptsDraft: DraftOutput = {
  title: "Custom GPTs lukker 11. december",
  summary: "Custom GPTs forsvinder fra ChatGPT i december. Her er, hvad det betyder for dit arbejde, og hvad du kan gøre nu.",
  objectives: ["Vide hvornår custom GPTs holder op med at virke", "Kende Skills og Plugins som afløsere"],
  reads: [
    {
      title: "Hvad sker der?",
      body: "Fra den 11. december 2026 kan du ikke længere oprette eller bruge custom GPTs i ChatGPT. Har du lavet egne assistenter på den måde, holder de op med at virke på datoen.\n\nAfløserne hedder Skills og Plugins. En eksisterende GPT kan omdannes til en Skill, inden fristen udløber.",
      claims: [
        { text: "Fra 11. december 2026 kan man ikke oprette eller bruge custom GPTs.", kind: "FACT", quote: "Starting December 11, 2026, custom GPTs will no longer be available in ChatGPT.", charStart: null, charEnd: null },
        { text: "Skills og Plugins afløser custom GPTs.", kind: "FACT", quote: "Skills and Plugins replace custom GPTs.", charStart: 0, charEnd: 5 },
        { text: "En GPT kan omdannes til en Skill før fristen.", kind: "FACT", quote: "You can convert an existing GPT into a Skill from the GPT editor before December 11, 2026.", charStart: null, charEnd: null },
      ],
    },
    {
      title: "Hvad skal du gøre?",
      body: "Gennemgå de assistenter, du bruger i dag. Tal med din leder eller IT-ansvarlige om, hvilke der skal flyttes, og følg jeres egne retningslinjer for data.",
      claims: [{ text: "Følg virksomhedens retningslinjer, og spørg IT, før du flytter assistenter.", kind: "GUIDANCE", quote: null, charStart: null, charEnd: null }],
    },
  ],
  quizzes: [
    {
      title: "Hvornår lukker de?",
      question: "Hvornår holder custom GPTs op med at virke i ChatGPT?",
      options: [
        { text: "11. december 2026", correct: true, feedback: "Rigtigt. Det er datoen i release notes." },
        { text: "1. januar 2027", correct: false, feedback: "Nej, datoen er tidligere." },
        { text: "De lukker ikke", correct: false, feedback: "Jo, de udfases." },
      ],
      explanation: "Udfasningen sker den 11. december 2026.",
      hints: ["Tænk på slutningen af året.", "Det er i december.", "Svaret er 11. december 2026."],
      claims: [{ text: "Custom GPTs udfases 11. december 2026.", kind: "FACT", quote: "Starting December 11, 2026, custom GPTs will no longer be available in ChatGPT.", charStart: 0, charEnd: 79 }],
    },
    {
      title: "Hvad afløser dem?",
      question: "Hvad kan du bruge i stedet for en custom GPT?",
      options: [
        { text: "Skills og Plugins", correct: true, feedback: "Rigtigt." },
        { text: "Ingenting", correct: false, feedback: "Der er afløsere." },
        { text: "Et andet firmas værktøj", correct: false, feedback: "Modulet sammenligner ikke udbydere." },
      ],
      explanation: "Skills og Plugins er afløserne.",
      hints: ["Der er to afløsere.", "Den ene hedder Skills.", "Svaret er Skills og Plugins."],
    },
  ],
};

export const supportedVerify = (ids: string[]): VerifyOutput => ({
  claims: ids.map((id) => ({ id, verdict: "SUPPORTED", reason: "Kilden siger det samme." })),
  language: { status: "PASS", fixes: [] },
});

export interface MockOptions {
  classification?: Classification | ((req: ContentModelRequest) => Classification);
  draft?: DraftOutput | ((attempt: number) => DraftOutput);
  verify?: (claimIds: string[], attempt: number) => VerifyOutput;
  draftModel?: string;
  verifyModel?: string;
}

export function mockContentModel(opts: MockOptions = {}) {
  const calls: { feature: ContentFeature; request: ContentModelRequest }[] = [];
  let drafts = 0;
  let verifies = 0;
  const call: CallContentModel = async (feature, request) => {
    calls.push({ feature, request });
    const usage = { tokensIn: 1000, tokensOut: 200, costDkk: 0.05 };
    if (feature === "CONTENT_CLASSIFY") {
      const c = typeof opts.classification === "function" ? opts.classification(request) : (opts.classification ?? customGptsClassification);
      return { modelId: "mock-small", output: c, usage };
    }
    if (feature === "CONTENT_DRAFT") {
      const d = typeof opts.draft === "function" ? opts.draft(drafts) : (opts.draft ?? customGptsDraft);
      drafts++;
      return { modelId: opts.draftModel ?? "mock-small", output: d, usage };
    }
    const ids = [...request.user.matchAll(/^- (c\d+):/gm)].map((m) => m[1]!);
    const out = opts.verify ? opts.verify(ids, verifies) : supportedVerify(ids);
    verifies++;
    return { modelId: opts.verifyModel ?? "mock-large", output: out, usage };
  };
  return { call, calls };
}
