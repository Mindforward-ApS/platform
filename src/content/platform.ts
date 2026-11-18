// Demo data for the signed-in platform. Everything here is placeholder until there is a backend.
// People are shown as initials only; never invent faces.
import { courses, type Course } from "./academy";

export const learner = { name: "Sofie Lund", first: "Sofie", initials: "SL", role: "Medarbejder", team: "Salg & service" };

export const progress: Record<string, number> = { "ai-paa-arbejdet": 40, "gode-prompts": 75, "mails-og-tilbud": 20, "excel-med-ai": 80, "data-og-gdpr": 100 };
export const saved = new Set(["ai-paa-arbejdet", "gode-prompts", "led-et-ai-team"]);

export const lessonTitles: Record<string, string[]> = {
  "ai-paa-arbejdet": ["Hvad AI kan, og hvad den ikke kan", "Copilot, Claude og ChatGPT side om side", "Din første samtale med en AI", "Giv AI'en den rigtige kontekst", "Tjek svaret, før du bruger det", "AI til mails", "AI til møder og referater", "AI til research", "Hvad må du dele?", "Byg din egen arbejdsgang", "Opgave: din egen uge med AI", "Afslutning og kursusbevis"],
  "gode-prompts": ["Hvorfor svarene bliver dårlige", "Rolle, opgave, format", "Giv eksempler", "Bed om spørgsmål tilbage", "Ret i stedet for at starte forfra", "Prompts til tekst", "Prompts til tal", "Gem dine bedste prompts", "Opgave: skriv tre prompts"],
  "mails-og-tilbud": ["Fra stikord til udkast", "Lyd som dig selv", "Svære mails", "Svar på klager", "Opbyg et tilbud", "Priser og forbehold", "Skabeloner, der kan genbruges", "Tjek tonen", "Opfølgning", "Opgave: et rigtigt tilbud"],
  "moeder-og-referater": ["Før mødet: dagsorden på 2 minutter", "Optag og transskribér", "Fra transskription til referat", "Beslutninger og opgaver", "Del referatet", "Hvad må optages?", "Opgave: referat fra dit næste møde"],
  "excel-med-ai": ["Bed om en formel", "Forstå en formel, du ikke selv har skrevet", "Rens data", "Opslag og sammenkædning", "Pivottabeller", "Grafer", "Opsummer et regneark", "Find fejl", "Datoer og tid", "Betinget formatering", "Makroer uden kode", "Copilot i Excel", "Tjek tallene", "Opgave: dit eget regneark"],
  "data-og-gdpr": ["Hvad er personoplysninger?", "Hvor ender dine data?", "Virksomhedens AI-politik", "Anonymiser før du deler", "Fortrolige dokumenter", "Kundedata", "Når noget går galt", "Opgave: tjek tre eksempler"],
  "research-med-ai": ["Stil det rigtige spørgsmål", "Find kilder", "Sammenlign kilder", "Opsummer lange dokumenter", "Opdag opdigtede svar", "Citater og henvisninger", "Research om konkurrenter", "Præsentér fundene", "Opgave: et kort research-notat"],
  "led-et-ai-team": ["Hvor står teamet i dag?", "Sæt regler, folk kan huske", "Roller og ansvar", "Vælg de første opgaver", "Træning i hverdagen", "Mål effekten", "Når nogen er skeptiske", "Data og sikkerhed for ledere", "Del gode eksempler", "Planen for de næste 90 dage", "Opgave: teamets AI-plan"],
};

export type Lesson = { n: number; title: string; minutes: number; task: boolean; done: boolean };
export function lessonsFor(c: Course): Lesson[] {
  const titles = lessonTitles[c.slug] ?? [];
  const doneCount = Math.round(((progress[c.slug] ?? 0) / 100) * titles.length);
  return titles.map((title, i) => ({
    n: i + 1,
    title,
    minutes: Math.max(4, Math.round(c.minutes / titles.length) + ((i * 3) % 5) - 2),
    task: title.startsWith("Opgave") || i % 3 === 2,
    done: i < doneCount,
  }));
}

export const courseBySlug = new Map(courses.map((c) => [c.slug, c]));
export const inProgress = courses.filter((c) => (progress[c.slug] ?? 0) > 0 && progress[c.slug] < 100);

// Øvemiljø (practice environment): tasks tied to lessons, with a score.
export type Task = { id: string; course: string; title: string; brief: string; status: "Ny" | "I gang" | "Afleveret"; score?: number; minutes: number };
export const tasks: Task[] = [
  { id: "t1", course: "ai-paa-arbejdet", title: "Skriv en mail til en kunde, der venter på svar", brief: "En kunde har ventet fem dage på et svar om levering. Brug AI til at skrive et kort, venligt svar med en ny dato. Svaret skal lyde som dig og må højst være 120 ord.", status: "I gang", minutes: 10 },
  { id: "t2", course: "gode-prompts", title: "Omskriv en dårlig prompt", brief: "Prompten \"skriv noget om vores produkt\" giver et generisk svar. Skriv den om med rolle, opgave og format, så svaret kan bruges på jeres hjemmeside.", status: "Afleveret", score: 86, minutes: 8 },
  { id: "t3", course: "data-og-gdpr", title: "Hvad må du dele?", brief: "Du får tre tekster. Markér, hvad der skal fjernes, før teksten må sendes til en AI.", status: "Afleveret", score: 92, minutes: 6 },
  { id: "t4", course: "gode-prompts", title: "Få AI'en til at stille spørgsmål tilbage", brief: "Skriv en prompt, hvor AI'en først stiller dig tre spørgsmål, før den laver en plan for et møde.", status: "Afleveret", score: 74, minutes: 7 },
  { id: "t5", course: "ai-paa-arbejdet", title: "Tjek et AI-svar for fejl", brief: "AI'en har lavet en opsummering af en rapport. Find de to påstande, der ikke står i rapporten.", status: "Ny", minutes: 9 },
  { id: "t6", course: "mails-og-tilbud", title: "Lav et tilbud ud fra stikord", brief: "Brug stikordene fra kunden til at lave et første udkast til et tilbud med pris, leveringstid og forbehold.", status: "Ny", minutes: 12 },
];

// Calendar (reference: month calendar Marco sent 2026-10-23). Dates are days in October 2026.
export type PlanEvent = { id: string; date: number; start: string; end: string; type: "Lektion" | "Øvelse" | "Holdmøde"; title: string; course?: string; href: string };
export const week = { year: 2026, month: 9, today: 23, weekStart: 19, now: "10:15", goal: 300 };
const L = "Lektion", O = "Øvelse", H = "Holdmøde";
export const plan: PlanEvent[] = ([
  [5, "08:30", "09:00", L, "Hvad AI kan, og hvad den ikke kan", "ai-paa-arbejdet", "/kurser/ai-paa-arbejdet/1"],
  [6, "09:00", "09:30", L, "Hvorfor svarene bliver dårlige", "gode-prompts", "/kurser/gode-prompts/1"],
  [7, "10:00", "10:30", O, "Hvad er personoplysninger?", "data-og-gdpr", "/oevemiljoe?opgave=t3"],
  [8, "13:00", "14:00", H, "Kickoff: AI i Salg & service", undefined, "/beskeder"],
  [9, "08:30", "09:00", L, "Copilot, Claude og ChatGPT side om side", "ai-paa-arbejdet", "/kurser/ai-paa-arbejdet/2"],
  [12, "08:30", "09:00", L, "Rolle, opgave, format", "gode-prompts", "/kurser/gode-prompts/2"],
  [13, "09:00", "09:30", L, "Din første samtale med en AI", "ai-paa-arbejdet", "/kurser/ai-paa-arbejdet/3"],
  [14, "10:00", "10:30", O, "Anonymiser før du deler", "data-og-gdpr", "/oevemiljoe?opgave=t3"],
  [14, "14:00", "14:30", L, "Opgave: tjek tre eksempler", "data-og-gdpr", "/kurser/data-og-gdpr/8"],
  [16, "11:00", "11:30", L, "Giv eksempler", "gode-prompts", "/kurser/gode-prompts/3"],
  [19, "08:30", "09:00", L, "Giv AI'en den rigtige kontekst", "ai-paa-arbejdet", "/kurser/ai-paa-arbejdet/4"],
  [19, "13:00", "14:00", H, "Salg & service: AI-status", undefined, "/beskeder"],
  [20, "09:00", "09:30", O, "Omskriv en dårlig prompt", "gode-prompts", "/oevemiljoe?opgave=t2"],
  [20, "11:00", "11:30", L, "Bed om spørgsmål tilbage", "gode-prompts", "/kurser/gode-prompts/4"],
  [21, "08:00", "08:30", L, "Tjek svaret, før du bruger det", "ai-paa-arbejdet", "/kurser/ai-paa-arbejdet/5"],
  [21, "10:00", "11:00", O, "Hvad må du dele?", "data-og-gdpr", "/oevemiljoe?opgave=t3"],
  [22, "09:30", "10:00", L, "Ret i stedet for at starte forfra", "gode-prompts", "/kurser/gode-prompts/5"],
  [22, "12:00", "13:00", H, "Del gode eksempler", undefined, "/beskeder"],
  [23, "08:30", "09:00", L, "AI til mails", "ai-paa-arbejdet", "/kurser/ai-paa-arbejdet/6"],
  [23, "10:00", "10:30", O, "Mail til en kunde, der venter", "ai-paa-arbejdet", "/oevemiljoe?opgave=t1"],
  [23, "11:30", "12:00", L, "Prompts til tekst", "gode-prompts", "/kurser/gode-prompts/6"],
  [23, "14:00", "14:30", O, "Tjek et AI-svar for fejl", "ai-paa-arbejdet", "/oevemiljoe?opgave=t5"],
  [24, "10:00", "10:30", O, "Lav et tilbud ud fra stikord", "mails-og-tilbud", "/oevemiljoe?opgave=t6"],
  [26, "08:30", "09:00", L, "AI til møder og referater", "ai-paa-arbejdet", "/kurser/ai-paa-arbejdet/7"],
  [26, "13:00", "14:00", H, "Salg & service: AI-status", undefined, "/beskeder"],
  [27, "09:00", "09:30", L, "Prompts til tal", "gode-prompts", "/kurser/gode-prompts/7"],
  [28, "10:00", "10:30", O, "Få AI'en til at stille spørgsmål tilbage", "gode-prompts", "/oevemiljoe?opgave=t4"],
  [29, "08:30", "09:00", L, "AI til research", "ai-paa-arbejdet", "/kurser/ai-paa-arbejdet/8"],
  [30, "11:00", "11:30", L, "Gem dine bedste prompts", "gode-prompts", "/kurser/gode-prompts/8"],
] as const).map(([date, start, end, type, title, course, href], i) => ({ id: `e${i}`, date, start, end, type, title, course, href }));

export type Member = { name: string; initials: string; role: string; course: string; progress: number; tasks: number; score: number | null; last: string };
export const team: Member[] = [
  { name: "Sofie Lund", initials: "SL", role: "Kundeservice", course: "ai-paa-arbejdet", progress: 40, tasks: 3, score: 84, last: "I dag" },
  { name: "Mads Holm", initials: "MH", role: "Sælger", course: "mails-og-tilbud", progress: 65, tasks: 5, score: 79, last: "I dag" },
  { name: "Ida Brandt", initials: "IB", role: "Kundeservice", course: "gode-prompts", progress: 100, tasks: 9, score: 91, last: "I går" },
  { name: "Jonas Kirk", initials: "JK", role: "Salgschef", course: "led-et-ai-team", progress: 20, tasks: 1, score: 72, last: "3 dage siden" },
  { name: "Nora Vang", initials: "NV", role: "Sælger", course: "ai-paa-arbejdet", progress: 0, tasks: 0, score: null, last: "Ikke startet" },
  { name: "Emil Dahl", initials: "ED", role: "Kundeservice", course: "data-og-gdpr", progress: 85, tasks: 6, score: 88, last: "I går" },
];

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

export const faq = [
  { q: "Hvordan virker øvemiljøet?", a: "Hver lektion har en opgave fra en rigtig arbejdsdag. Du løser den med AI direkte i øvemiljøet og får en score og konkret feedback." },
  { q: "Hvornår får jeg et kursusbevis?", a: "Når du har set alle lektioner og afleveret den afsluttende opgave i øvemiljøet." },
  { q: "Kan jeg tage kurserne på telefonen?", a: "Ja. Lektionerne er korte og virker på telefon, tablet og computer." },
  { q: "Hvem kan se mine resultater?", a: "Du selv. Hvis du er en del af et hold, kan din leder se dit fremskridt og dine scorer, men ikke hvad du skriver i øvemiljøet." },
  { q: "Hvordan ændrer jeg mit abonnement?", a: "Under Indstillinger → Abonnement. Der er ingen binding." },
];
