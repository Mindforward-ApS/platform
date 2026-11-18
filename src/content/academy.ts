// Demo course catalogue (copied from the website). Swap for the real Mindforward modules.
// Courses, lessons and plans are demo data. Proof (learners, ratings, instructors, logos) is placeholder until real (§7).

export type Level = "Begynder" | "Øvet" | "Ekspert";

export type Course = {
  slug: string;
  title: string;
  category: "AI i hverdagen" | "Skrivning" | "Data" | "Ledelse";
  level: Level;
  lessons: number;
  minutes: number;
  summary: string;
  hue: number; // cover artwork tint (warm family)
};

export const categories = ["Alle", "AI i hverdagen", "Skrivning", "Data", "Ledelse"] as const;

export const courses: Course[] = [
  { slug: "ai-paa-arbejdet", title: "AI på arbejdet: de første 30 dage", category: "AI i hverdagen", level: "Begynder", lessons: 12, minutes: 95, summary: "Kom trygt i gang med Copilot, Claude og ChatGPT på dine egne opgaver.", hue: 35 },
  { slug: "gode-prompts", title: "Skriv prompts, der giver brugbare svar", category: "Skrivning", level: "Begynder", lessons: 9, minutes: 70, summary: "En enkel metode til at få præcise svar første gang.", hue: 20 },
  { slug: "mails-og-tilbud", title: "Mails og tilbud på halvdelen af tiden", category: "Skrivning", level: "Øvet", lessons: 10, minutes: 80, summary: "Skabeloner og AI-udkast, der stadig lyder som dig.", hue: 50 },
  { slug: "excel-med-ai", title: "Excel og regneark med AI", category: "Data", level: "Øvet", lessons: 14, minutes: 120, summary: "Formler, opsummeringer og overblik uden at kunne kode.", hue: 60 },
  { slug: "data-og-gdpr", title: "AI, data og GDPR i praksis", category: "Data", level: "Begynder", lessons: 8, minutes: 60, summary: "Hvad må du dele med en AI, og hvad må du ikke?", hue: 10 },
  { slug: "moeder-og-referater", title: "Møder og referater med AI", category: "AI i hverdagen", level: "Begynder", lessons: 7, minutes: 55, summary: "Lad AI tage noterne, og få et referat, du kan sende med det samme.", hue: 42 },
  { slug: "research-med-ai", title: "Research og opsummering med AI", category: "Data", level: "Øvet", lessons: 9, minutes: 75, summary: "Find, sammenlign og opsummer kilder, og tjek at svaret holder.", hue: 15 },
  { slug: "led-et-ai-team", title: "Led et team, der bruger AI", category: "Ledelse", level: "Ekspert", lessons: 11, minutes: 105, summary: "Regler, roller og en plan, så alle kommer med.", hue: 28 },
];

export const outcomes = [
  { title: "Spar tid hver uge", body: "Lær at lade AI tage første udkast af mails, referater og tilbud, så du bruger tiden på det, der kræver dig." },
  { title: "Brug AI sikkert", body: "Forstå, hvilke data du må dele, og hvordan du tjekker svarene, før de går videre." },
  { title: "Skriv bedre prompts", body: "En fast metode, der giver præcise svar første gang, uanset om du bruger Copilot, Claude eller ChatGPT." },
  { title: "Få et bevis", body: "Afslut hvert forløb med en opgave fra din egen hverdag og et kursusbevis, du kan dele." },
];

export const steps = [
  { title: "Vælg et forløb", body: "Start med en kort test, så foreslår vi det forløb, der passer til dit niveau." },
  { title: "Lær 10 minutter ad gangen", body: "Korte lektioner med video og øvelser, du kan tage mellem to møder." },
  { title: "Øv på dine egne opgaver", body: "Hver lektion slutter med en opgave fra din hverdag, ikke en opdigtet case." },
  { title: "Få feedback og bevis", body: "Få feedback på din afsluttende opgave og et kursusbevis, når du er færdig." },
];

export const preview = {
  course: "AI på arbejdet: de første 30 dage",
  lesson: "Lektion 3 · Dit første gode udkast",
  minutes: "8 min",
  chapters: [
    { t: "Hvad AI er god til, og hvad den ikke er", d: "6 min", done: true },
    { t: "Sådan skriver du en klar opgave", d: "7 min", done: true },
    { t: "Dit første gode udkast", d: "8 min", active: true },
    { t: "Tjek svaret, før du bruger det", d: "6 min" },
    { t: "Øvelse: din egen mail", d: "10 min" },
  ],
  notes: [
    "Fortæl AI'en, hvem modtageren er, og hvad du vil opnå.",
    "Giv et eksempel på den tone, du plejer at skrive i.",
    "Bed om tre korte versioner, og vælg den bedste.",
  ],
};

// Prices and plan contents from mindforward.dk (Marco 2026-10-22: "pris oplysningerne fra mindforward som det eneste").
// Annual = 2 months free (Marco 2026-10-22): 10 × 69 = 690 kr; full price 12 × 69 = 828 kr is shown struck through.
export const plans: {
  id: string; name: string; tag: string; priceMonthly: number | string; priceYearly: number | string | null;
  unit: string; unitYearly: string; for: string; items: string[]; cta: string; recommended?: boolean;
}[] = [
  { id: "privat", name: "Privat", tag: "Til dig", priceMonthly: "69 kr", priceYearly: "690 kr", unit: "/md. inkl. moms", unitYearly: "/år inkl. moms", for: "Privat indeholder:", items: ["Alle moduler i niveau 1", "Øvemiljø med opgaver", "Certifikat med ID", "Opsig, når du vil"], cta: "Kom i gang" },
  { id: "virksomhed", name: "Virksomhed", tag: "Til hold", priceMonthly: "69 kr", priceYearly: "690 kr", unit: "/bruger/md. ekskl. moms", unitYearly: "/bruger/år ekskl. moms", for: "Virksomhed indeholder:", recommended: true, items: ["Alt i Privat for hver medarbejder", "Teamoverblik og rapport", "Invitation via e-mail, link eller domæne", "Databehandleraftale", "Mindst 5 brugere"], cta: "Kom i gang" },
  { id: "tilpasset", name: "Tilpasset", tag: "Til store", priceMonthly: "Efter aftale", priceYearly: "Efter aftale", unit: "", unitYearly: "", for: "Tilpasset indeholder:", items: ["Alt i Virksomhed", "Pris efter antal brugere", "Hjælp til opsætning og invitationer", "Fast kontaktperson"], cta: "Tal med os" },
];

export const faq = [
  { q: "Kræver kurserne, at jeg kan noget i forvejen?", a: "Nej. Begynderkurserne starter helt fra bunden. Du skal bare have adgang til en computer og en af de almindelige AI-assistenter." },
  { q: "Hvor lang tid tager et kursus?", a: "Et kursus tager typisk 1–2 timer i alt, fordelt på lektioner af cirka 10 minutter. Du bestemmer selv tempoet." },
  { q: "Hvilke AI-værktøjer bruger I?", a: "Vi viser øvelserne i Copilot, Claude og ChatGPT. Metoderne virker i dem alle." },
  { q: "Får jeg et bevis?", a: "Ja. Når du har afsluttet lektionerne og den afsluttende opgave, får du et kursusbevis, du kan dele." },
  { q: "Kan vi købe til hele virksomheden?", a: "Ja, med Team-planen fra 5 brugere. I får et overblik over fremskridt og kan betale med faktura." },
  { q: "Kan jeg opsige mit medlemskab?", a: "Ja, når som helst. Du beholder adgangen perioden ud." },
];
