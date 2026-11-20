import { z } from "zod";

// Versioned prompt as data (docs/06 § 6.1). The model writes only the learner-facing parts; ids, tracks, tier,
// featureRefs, attribution, autoUpdatedAt and sourceRef ids/urls are set by code (draft.ts).

const draftClaim = z.object({
  text: z.string().min(1).max(400),
  kind: z.enum(["FACT", "GUIDANCE"]),
  /** FACT: exact substring of the source text (≤ 300 chars) and its offsets. GUIDANCE: null. */
  quote: z.string().max(300).nullable(),
  charStart: z.number().int().min(0).nullable(),
  charEnd: z.number().int().min(0).nullable(),
});
export type DraftClaim = z.infer<typeof draftClaim>;

export const draftOutputSchema = z.object({
  title: z.string().min(3).max(60),
  summary: z.string().min(10).max(200),
  objectives: z.array(z.string().min(5).max(140)).min(2).max(3),
  reads: z
    .array(z.object({ title: z.string().min(2).max(80), body: z.string().min(20).max(1000), claims: z.array(draftClaim).max(10) }))
    .min(1)
    .max(2),
  quizzes: z
    .array(
      z.object({
        title: z.string().min(2).max(80),
        question: z.string().min(5).max(400),
        options: z.array(z.object({ text: z.string().min(1).max(300), correct: z.boolean(), feedback: z.string().max(300) })).min(2).max(6),
        explanation: z.string().max(600),
        hints: z.array(z.string().min(5).max(600)).length(3),
        claims: z.array(draftClaim).max(10).optional(),
      }),
    )
    .min(2)
    .max(3),
});
export type DraftOutput = z.infer<typeof draftOutputSchema>;

export const contentDraftV1 = {
  key: "content-draft",
  version: "v1",
  toolName: "draft_module",
  maxTokens: 3000,
  temperature: 0.3,
  outputSchema: draftOutputSchema,
  system: `Du skriver et kort nyhedsmodul til Mindforward, en dansk læringsplatform for medarbejdere der bruger AI-værktøjer på arbejdet. Målgruppen er travle kontormedarbejdere uden teknisk baggrund. Du returnerer KUN et modul via værktøjet \`draft_module\` (JSON efter schemaet).

Indhold:
- 1–2 READ-trin (reads), hver maks 120 ord. Struktur: Hvad er nyt → hvad betyder det i dit arbejde → hvad skal du gøre (evt. "ingenting").
- 2–3 QUIZ-spørgsmål (quizzes) med 3–4 svarmuligheder, præcis ét rigtigt svar, en kort forklaring og 3 hints (et skub, et konkret hint, løsningen). Spørg til forståelse og brug, ikke til datoer eller trivia, medmindre datoen er det vigtige (fx udfasning).

Faktaregler (brydes de, afvises modulet):
1. Hver faktuel påstand om værktøjet er et claim med kind "FACT". quote skal være en EKSAKT delstreng af kildeteksten (mellem KILDETEKST START og SLUT), maks 300 tegn, og charStart/charEnd skal passe (tallene i [[…]] markerer tegn-positioner og er ikke en del af teksten). Hvert claim bygger på ét citat fra én kilde.
2. Brug kun det, der står i kildeteksten. Ingen forhåndsviden, ingen spekulation om fremtiden, ingen priser medmindre de står i kilden.
3. Region og abonnement: følg instruktionerne i brugerbeskeden præcist.
4. Skriv med dine egne ord på naturligt dansk. Kopiér ikke sætninger fra kilden. Funktionsnavne må stå på engelsk som i værktøjet (fx "custom GPTs").
5. Brug produktnavne beskrivende ("i ChatGPT", "i Microsoft 365 Copilot"). Påstå aldrig at Mindforward er tilknyttet, godkendt eller anbefalet af en udbyder.
6. Ingen omtale af AI-forordningen, lovkrav, certificeringskrav eller bøder.
7. Ingen superlativer ("revolutionerende", "den bedste"), ingen sammenligning mellem udbydere.
8. Råd (kind "GUIDANCE", quote null) skal være forsigtige og generelle: følg virksomhedens retningslinjer, del ikke persondata, spørg IT.

Titel: maks 60 tegn, konkret ("Custom GPTs lukker 11. december"). Ingen udråbstegn. Aldrig "GPT" i Mindforwards egne navne.`,
  buildUser(input: {
    classification: unknown;
    title: string;
    text: string;
    track: string;
    requiresTier: string | null;
    regionInstruction: string;
    plansInstruction: string;
    feedback?: string;
  }): string {
    const marked = input.text.replace(/[\s\S]{1,500}/g, (chunk, offset: number) => `[[${offset}]]${chunk}`);
    return [
      `Spor: ${input.track}${input.requiresTier ? ` · Niveau: ${input.requiresTier}` : ""}`,
      `Region: ${input.regionInstruction}`,
      `Abonnement: ${input.plansInstruction}`,
      `Klassifikation (JSON): ${JSON.stringify(input.classification)}`,
      `Titel i kilden: ${input.title}`,
      "KILDETEKST START",
      marked,
      "KILDETEKST SLUT",
      input.feedback ? `\nFaktatjekkerens indvendinger mod forrige udkast (ret dem):\n${input.feedback}` : "",
    ].join("\n");
  },
} as const;
