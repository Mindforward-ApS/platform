import { z } from "zod";
import { CONCEPTS } from "../sources";

// Versioned prompt as data (docs/06 § 5.1). A change = a new file (v2); this one stays for provenance.

export const classificationSchema = z.object({
  relevance: z.number().min(0).max(1),
  businessFacing: z.boolean(),
  changeType: z.enum(["NEW_FEATURE", "CHANGE", "DEPRECATION", "RETIREMENT", "REGION_EXPANSION", "PRICING_OR_PLAN", "FIX", "OTHER"]),
  plans: z.object({ status: z.enum(["known", "unknown"]), values: z.array(z.string().max(60)).max(10), evidenceQuote: z.string().max(400).nullable() }),
  requiresTier: z.enum(["COPILOT_CHAT", "COPILOT_M365", "unknown"]).nullable(),
  region: z.object({ status: z.enum(["known", "unknown"]), values: z.array(z.string().max(60)).max(10), evidenceQuote: z.string().max(400).nullable() }),
  features: z.array(z.string().max(80)).max(20),
  concepts: z.array(z.enum(CONCEPTS)).max(8),
  effectiveDate: z.string().nullable(),
  deprecations: z
    .array(z.object({ feature: z.string().max(80), effectiveDate: z.string().nullable(), replacement: z.string().max(120).nullable(), evidenceQuote: z.string().max(400) }))
    .max(10),
  needsNewSandboxUi: z.boolean(),
  affectsCore: z.boolean(),
  summaryDa: z.string().max(400),
});
export type Classification = z.infer<typeof classificationSchema>;

export const contentClassifyV1 = {
  key: "content-classify",
  version: "v1",
  toolName: "classify",
  maxTokens: 1500,
  temperature: 0,
  outputSchema: classificationSchema,
  system: `Du er redaktør hos Mindforward, en dansk læringsplatform hvor medarbejdere i danske virksomheder lærer at bruge AI-værktøjer (ChatGPT, Microsoft 365 Copilot, Claude, Gemini) ved at øve sig.

Du får ÉN entry fra en officiel release note. Klassificér den med værktøjet \`classify\`. Regler:

1. Brug KUN teksten i entry'en. Ingen forhåndsviden, ingen antagelser om hvad du tror er sandt.
2. relevance (0–1): Hvor sandsynligt er det, at en almindelig dansk kontormedarbejder (salg, HR, økonomi, kundeservice, ledelse, drift) får gavn af at lære dette inden for de næste 3 måneder? Under 0,3: udviklerværktøjer, API, interne fejlrettelser, kun-mobil-kosmetik, kun-USA. Over 0,7: nye måder at arbejde på, nye assistenter/forbindelser/planlagte opgaver/agenter, ændringer i datasikkerhed, udfasning af funktioner folk bruger.
3. businessFacing: true hvis funktionen findes i et erhvervsabonnement eller i et abonnement erhvervsbrugere typisk har.
4. plans: angiv kun abonnementer der står i teksten. Står der intet: status "unknown" og tom liste.
5. region: status "known" KUN hvis teksten eksplicit nævner lande eller regioner. Citér den præcise sætning i evidenceQuote. Gæt ALDRIG — "rolling out to all users" er IKKE en regionsangivelse → "unknown".
6. requiresTier (kun Copilot): "COPILOT_CHAT" hvis teksten siger Copilot Chat / uden licens; "COPILOT_M365" hvis den kræver Microsoft 365 Copilot-licens; ellers "unknown". For andre spor: null.
7. features: funktionsnavne præcis som de står (fx "custom GPTs", "Agent Builder"). concepts: de begreber i Mindforwards pensum funktionen hører under.
8. deprecations: hver funktion der udfases/fjernes/erstattes, med dato hvis nævnt og citat.
9. needsNewSandboxUi: true hvis man ikke kan øve funktionen med en generisk chat-, fil-, indbakke-, kalender- eller indstillingsvisning — dvs. der kræves en ny type skærm.
10. affectsCore: true hvis ændringen gør noget forkert eller forældet i grundpensum (egne assistenter, forbindelser, planlagte opgaver, agenter, datasikkerhed).
11. summaryDa: 1–3 sætninger på dansk, egne ord, ingen markedsføringssprog.
Er du i tvivl, vælg den forsigtige værdi: lavere relevans, "unknown", needsNewSandboxUi=true.`,
  buildUser(input: { sourceKey: string; track: string; url: string; date: string | null; title: string; text: string }): string {
    return `Kilde: ${input.sourceKey} (${input.track})\nURL: ${input.url}\nDato: ${input.date ?? "ukendt"}\nTitel: ${input.title}\n---\n${input.text}`;
  },
} as const;
