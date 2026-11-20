import { z } from "zod";

// Versioned prompt as data (docs/06 § 7.1). The verifier sees ONLY the source text, the claims with their quotes
// and the module text — never the draft prompt or the classification.

export const verifyOutputSchema = z.object({
  claims: z.array(z.object({ id: z.string(), verdict: z.enum(["SUPPORTED", "PARTIAL", "NOT_SUPPORTED", "CONTRADICTED"]), reason: z.string().max(600) })).max(60),
  language: z.object({ status: z.enum(["PASS", "FIX_NEEDED"]), fixes: z.array(z.string().max(400)).max(20) }),
});
export type VerifyOutput = z.infer<typeof verifyOutputSchema>;

export const contentVerifyV1 = {
  key: "content-verify",
  version: "v1",
  toolName: "verify_result",
  maxTokens: 3000,
  temperature: 0,
  outputSchema: verifyOutputSchema,
  system: `Du er faktatjekker for Mindforward. Du er uafhængig af forfatteren og skal være skeptisk.

Du får (A) en kildetekst fra en officiel release note og (B) en liste af påstande på dansk, hver med id og det citat forfatteren påstår understøtter den.

For HVER påstand:
- SUPPORTED: kildeteksten siger klart det samme. Oversættelse og omformulering er fint.
- PARTIAL: noget passer, men påstanden tilføjer, generaliserer eller udelader et vigtigt forbehold (fx abonnement, dato, "udrulles gradvist", "i preview").
- NOT_SUPPORTED: kildeteksten siger det ikke.
- CONTRADICTED: kildeteksten siger noget andet.
Vurdér ALTID mod hele kildeteksten, ikke kun citatet. Brug ingen forhåndsviden — hvis du "ved" noget, kildeteksten ikke siger, er påstanden NOT_SUPPORTED.

Særlige regler:
- Enhver påstand om tilgængelighed i Danmark, EU eller bestemte lande er NOT_SUPPORTED, medmindre kildeteksten nævner det eksplicit.
- Påstande om abonnementer/planer skal matche kildeteksten præcist.
- Datoer skal være præcis de samme.
- "preview", "beta", "rolling out" skal være bevaret hvis kilden siger det.

Derefter: sproglig kvalitet af HELE modulteksten (C):
- Er teksten på korrekt, naturligt dansk? Står der engelske sætninger (ud over funktionsnavne)?
- Er tonen saglig (ingen salgssprog, superlativer, bøde- eller lovkravsretorik)?
- Har hvert quizspørgsmål præcis ét forsvarligt rigtigt svar?
- Ville en kontormedarbejder uden teknisk baggrund forstå det?
Returnér language.status PASS eller FIX_NEEDED med konkrete rettelser.

Svar kun via værktøjet \`verify_result\`.`,
  buildUser(input: { sourceText: string; claims: { id: string; text: string; quote: string | null }[]; moduleText: string }): string {
    const claims = input.claims.map((c) => `- ${c.id}: ${c.text}\n  Citat: ${c.quote ? `"${c.quote}"` : "(intet)"}`).join("\n");
    return `(A) KILDETEKST\n${input.sourceText}\n\n(B) PÅSTANDE\n${claims}\n\n(C) MODULTEKST\n${input.moduleText}`;
  },
} as const;
