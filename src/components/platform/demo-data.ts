// Example data for the platform widgets greb has no backend for yet (calendar, messages). Shown only with an
// "Eksempeldata" mark. Copied from the approved platform (mindforward-platform/src/content/platform.ts); links point
// at greb's routes. People are shown as initials only; never invent faces.

/** Titles of the example courses the calendar events belong to. */
export const courseTitle: Record<string, string> = {
  "ai-paa-arbejdet": "AI på arbejdet: de første 30 dage",
  "gode-prompts": "Skriv prompts, der giver brugbare svar",
  "mails-og-tilbud": "Mails og tilbud på halvdelen af tiden",
  "data-og-gdpr": "AI, data og GDPR i praksis",
};

// Calendar (reference: month calendar Marco sent 2026-10-23). Dates are days in October 2026.
export type PlanEvent = { id: string; date: number; start: string; end: string; type: "Lektion" | "Øvelse" | "Holdmøde"; title: string; course?: string; href: string };
export const week = { year: 2026, month: 9, today: 23, weekStart: 19, now: "10:15", goal: 300 };
const L = "Lektion", O = "Øvelse", H = "Holdmøde";
export const plan: PlanEvent[] = ([
  [5, "08:30", "09:00", L, "Hvad AI kan, og hvad den ikke kan", "ai-paa-arbejdet", "/forloeb"],
  [6, "09:00", "09:30", L, "Hvorfor svarene bliver dårlige", "gode-prompts", "/forloeb"],
  [7, "10:00", "10:30", O, "Hvad er personoplysninger?", "data-og-gdpr", "/sandkasse/chatgpt"],
  [8, "13:00", "14:00", H, "Kickoff: AI i Salg & service", undefined, "/beskeder"],
  [9, "08:30", "09:00", L, "Copilot, Claude og ChatGPT side om side", "ai-paa-arbejdet", "/forloeb"],
  [12, "08:30", "09:00", L, "Rolle, opgave, format", "gode-prompts", "/forloeb"],
  [13, "09:00", "09:30", L, "Din første samtale med en AI", "ai-paa-arbejdet", "/forloeb"],
  [14, "10:00", "10:30", O, "Anonymiser før du deler", "data-og-gdpr", "/sandkasse/chatgpt"],
  [14, "14:00", "14:30", L, "Opgave: tjek tre eksempler", "data-og-gdpr", "/forloeb"],
  [16, "11:00", "11:30", L, "Giv eksempler", "gode-prompts", "/forloeb"],
  [19, "08:30", "09:00", L, "Giv AI'en den rigtige kontekst", "ai-paa-arbejdet", "/forloeb"],
  [19, "13:00", "14:00", H, "Salg & service: AI-status", undefined, "/beskeder"],
  [20, "09:00", "09:30", O, "Omskriv en dårlig prompt", "gode-prompts", "/sandkasse/chatgpt"],
  [20, "11:00", "11:30", L, "Bed om spørgsmål tilbage", "gode-prompts", "/forloeb"],
  [21, "08:00", "08:30", L, "Tjek svaret, før du bruger det", "ai-paa-arbejdet", "/forloeb"],
  [21, "10:00", "11:00", O, "Hvad må du dele?", "data-og-gdpr", "/sandkasse/chatgpt"],
  [22, "09:30", "10:00", L, "Ret i stedet for at starte forfra", "gode-prompts", "/forloeb"],
  [22, "12:00", "13:00", H, "Del gode eksempler", undefined, "/beskeder"],
  [23, "08:30", "09:00", L, "AI til mails", "ai-paa-arbejdet", "/forloeb"],
  [23, "10:00", "10:30", O, "Mail til en kunde, der venter", "ai-paa-arbejdet", "/sandkasse/chatgpt"],
  [23, "11:30", "12:00", L, "Prompts til tekst", "gode-prompts", "/forloeb"],
  [23, "14:00", "14:30", O, "Tjek et AI-svar for fejl", "ai-paa-arbejdet", "/sandkasse/chatgpt"],
  [24, "10:00", "10:30", O, "Lav et tilbud ud fra stikord", "mails-og-tilbud", "/sandkasse/chatgpt"],
  [26, "08:30", "09:00", L, "AI til møder og referater", "ai-paa-arbejdet", "/forloeb"],
  [26, "13:00", "14:00", H, "Salg & service: AI-status", undefined, "/beskeder"],
  [27, "09:00", "09:30", L, "Prompts til tal", "gode-prompts", "/forloeb"],
  [28, "10:00", "10:30", O, "Få AI'en til at stille spørgsmål tilbage", "gode-prompts", "/sandkasse/chatgpt"],
  [29, "08:30", "09:00", L, "AI til research", "ai-paa-arbejdet", "/forloeb"],
  [30, "11:00", "11:30", L, "Gem dine bedste prompts", "gode-prompts", "/forloeb"],
] as const).map(([date, start, end, type, title, course, href], i) => ({ id: `e${i}`, date, start, end, type, title, course, href }));

export type Thread = { id: string; from: string; initials: string; subject: string; preview: string; time: string; unread: boolean; messages: { me: boolean; text: string; time: string }[] };
export const threads: Thread[] = [
  { id: "m1", from: "Mindforward", initials: "MF", subject: "Feedback på din opgave", preview: "Din omskrevne prompt fik 86 point. Formatet er klart, men…", time: "09:12", unread: true, messages: [
    { me: false, text: "Din omskrevne prompt fik 86 point. Formatet er klart, og rollen er godt valgt. Prøv at give ét eksempel på den tone, I bruger på hjemmesiden, så rammer svaret endnu tættere.", time: "09:12" },
  ] },
  { id: "m2", from: "Jonas Kirk", initials: "JK", subject: "Holdmøde mandag", preview: "Tag gerne et eksempel med, hvor AI sparede dig tid…", time: "I går", unread: true, messages: [
    { me: false, text: "Hej alle. Tag gerne et eksempel med til mandag, hvor AI sparede dig tid i denne uge. Fem minutter hver.", time: "I går 14:03" },
    { me: true, text: "Gør jeg. Jeg tager mailen til kunden med leveringsdatoen.", time: "I går 14:20" },
  ] },
  { id: "m3", from: "Mindforward", initials: "MF", subject: "Nyt kursus: Research med AI", preview: "Et nyt kursus er klar i dit katalog…", time: "Man", unread: true, messages: [
    { me: false, text: "Et nyt kursus er klar i dit katalog: Research og opsummering med AI. 9 lektioner, 75 minutter, opgaver i øvemiljøet.", time: "Man 08:00" },
  ] },
  { id: "m4", from: "Ida Brandt", initials: "IB", subject: "Din prompt-skabelon", preview: "Tak for skabelonen, den virker også til klager…", time: "Fre", unread: false, messages: [
    { me: false, text: "Tak for skabelonen, den virker også til klager. Må jeg dele den med resten af kundeservice?", time: "Fre 11:41" },
    { me: true, text: "Selvfølgelig, del løs.", time: "Fre 11:50" },
  ] },
];

