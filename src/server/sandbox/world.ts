import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { worldSchema, type World } from "@/lib/schemas/world";

// Nordlys Logistik ApS seed world (docs/04 § 4): immutable, versioned content in content/sandbox-world/, shipped with
// the deployment (next.config.ts outputFileTracingIncludes) and Zod-validated once per process.

const WORLD_DIR = join(process.cwd(), "content", "sandbox-world");
export const SANDBOX_TIME_ZONE = "Europe/Copenhagen";

export interface LoadedWorld extends World {
  /** Markdown/CSV bodies by file id (the spreadsheet f15 lives in `budget`). */
  fileBodies: Record<string, string>;
}

let cached: LoadedWorld | undefined;

const readJson = (name: string): unknown => JSON.parse(readFileSync(join(WORLD_DIR, name), "utf8"));

export function loadWorld(): LoadedWorld {
  if (cached) return cached;
  const world = worldSchema.parse({
    version: readFileSync(join(WORLD_DIR, "world.version"), "utf8").trim(),
    company: readJson("company.json"),
    employees: readJson("employees.json"),
    mail: readJson("mail.json"),
    calendar: readJson("calendar.json"),
    files: readJson("files.json"),
    crm: readJson("crm.json"),
    budget: readJson("budget.json"),
  });
  const fileBodies: Record<string, string> = {};
  for (const f of world.files) if (f.path) fileBodies[f.id] = readFileSync(join(WORLD_DIR, f.path), "utf8");
  cached = { ...world, fileBodies };
  return cached;
}

export function worldVersion(): string {
  return loadWorld().version;
}

// ── relative dates (docs/04 § 2: anchored at session start, Europe/Copenhagen) ──

/** Calendar date (YYYY-MM-DD) of `instant` in Copenhagen. */
export function copenhagenDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SANDBOX_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Session-start anchor + dayOffset → Copenhagen calendar date (YYYY-MM-DD). DST-safe: pure calendar arithmetic. */
export function resolveDay(anchor: Date, dayOffset: number): string {
  const [y, m, d] = copenhagenDate(anchor).split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + dayOffset));
  return date.toISOString().slice(0, 10);
}

/** Danish label, e.g. "tirsdag 14. oktober 2026". */
export function formatDayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("da-DK", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

// ── summary for the model (cached prompt block, docs/04 § 5) ──

export function worldSummary(world: LoadedWorld = loadWorld()): string {
  const c = world.company;
  const lines = [
    "NORDLYS-VERDENEN (fiktive øvedata)",
    `Virksomhed: ${c.name} — ${c.description} ${c.employeeCount} ansatte. Adresse: ${c.address}. CVR: ${c.cvr}.`,
    `Fakta: ${c.facts.join("; ")}. Værdier: "${c.values}". Aktuelle temaer: ${c.currentThemes.join(", ")}.`,
    "",
    "Medarbejdere (id · navn · rolle · mail):",
    ...world.employees.map((e) => `- ${e.id} · ${e.name}${e.isLearner ? " (brugeren)" : ""} · ${e.role} · ${e.email}`),
    "",
    "Kunder i CRM (id · navn · branche · by · segment · status):",
    ...world.crm.map((k) => `- ${k.id} · ${k.name} · ${k.industry} · ${k.city} · ${k.segment ?? "—"} · ${k.status}`),
    "",
    "Filer (id · navn):",
    ...world.files.map((f) => `- ${f.id} · ${f.name}${f.confidential ? " (fortrolig)" : ""}`),
    "",
    "Mail, kalender, filindhold, kundedetaljer og regneark kan kun læses via forbundne værktøjer.",
  ];
  return lines.join("\n");
}
