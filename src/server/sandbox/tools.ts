import "server-only";
import { z } from "zod";
import type { ConnectorId, Scope, ToolName } from "./events";
import type { SandboxState } from "./reducer";
import { formatDayLabel, resolveDay, type LoadedWorld } from "./world";

// Model tool calls (docs/04 § 6). Every tool runs against the session's projection (seed world + overlay state)
// and NEVER against an external system. M3 ships the read tools; write tools (draft/send/create/update) need the
// confirmation card and arrive with the module player.

export interface ToolContext {
  world: LoadedWorld;
  state: SandboxState;
  /** Session start: anchors relative dates. */
  anchor: Date;
}

export interface ToolOutcome {
  /** JSON-serialisable result returned to the model (truncated to ~2.000 tokens). */
  result: unknown;
  resultCount: number;
  /** Names of the filters/arguments the model used — never their values (docs/04 § 6.3). */
  filtersUsed: string[];
}

interface ToolDef<S extends z.ZodType> {
  name: ToolName;
  connectorId: ConnectorId;
  scope: Scope;
  description: string;
  input: S;
  run: (ctx: ToolContext, input: z.infer<S>) => Omit<ToolOutcome, "filtersUsed">;
}

const MAX_RESULT_CHARS = 8000; // ≈ 2.000 tokens
const MAX_HITS = 10;
const EXCERPT = 200;

const excerpt = (s: string) => (s.length > EXCERPT ? `${s.slice(0, EXCERPT)}…` : s);
const norm = (s: string) => s.toLocaleLowerCase("da-DK");
const words = (q: string) => norm(q).split(/\s+/).filter(Boolean);
const matchesAll = (haystack: string, q?: string) => !q || words(q).every((w) => norm(haystack).includes(w));

// ── sheet (f15 "Budget 2026") ─────────────────────────────────────────────

const COLS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export interface SheetCell {
  value: string | number;
  formula?: string;
  note?: string;
}

/** A1-addressed cells of the budget sheet, with the session's edits applied. */
export function buildSheetCells(world: LoadedWorld, state: SandboxState): Record<string, SheetCell> {
  const cells: Record<string, SheetCell> = {};
  world.budget.columns.forEach((title, i) => (cells[`${COLS[i]}1`] = { value: title }));
  for (const r of world.budget.rows) {
    const n = r.row;
    cells[`A${n}`] = { value: r.post, ...(r.note ? { note: r.note } : {}) };
    cells[`B${n}`] = { value: r.q1 };
    cells[`C${n}`] = { value: r.q2 };
    cells[`D${n}`] = { value: r.q3 };
    cells[`E${n}`] = { value: r.q4 };
    cells[`F${n}`] = { value: r.total, formula: r.totalFormula };
    cells[`G${n}`] = { value: r.budget };
    cells[`H${n}`] = { value: r.total - r.budget, formula: `=F${n}-G${n}` };
  }
  for (const [cell, next] of Object.entries(state.sheet.values)) {
    cells[cell] = typeof next === "string" && next.startsWith("=") ? { ...cells[cell], value: cells[cell]?.value ?? "", formula: next } : { value: next };
  }
  return cells;
}

function expandRange(range: string): string[] {
  const m = /^([A-H])(\d{1,2})(?::([A-H])(\d{1,2}))?$/.exec(range.toUpperCase());
  if (!m) return [];
  const [c1, r1] = [COLS.indexOf(m[1] as (typeof COLS)[number]), Number(m[2])];
  const [c2, r2] = m[3] ? [COLS.indexOf(m[3] as (typeof COLS)[number]), Number(m[4])] : [c1, r1];
  const out: string[] = [];
  for (let r = Math.min(r1, r2); r <= Math.min(Math.max(r1, r2), 20); r++) for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) out.push(`${COLS[c]}${r}`);
  return out;
}

// ── tool definitions ──────────────────────────────────────────────────────

const crmFilter = z.strictObject({
  segment: z.enum(["A", "B", "C"]).optional(),
  status: z.enum(["ACTIVE", "LEAD", "TRIAL", "CANCELED"]).optional(),
  city: z.string().max(40).optional(),
  industry: z.string().max(40).optional(),
  minRevenue: z.number().int().min(0).optional(),
});

function def<S extends z.ZodType>(d: ToolDef<S>): ToolDef<S> {
  return d;
}

export const TOOLS = [
  def({
    name: "mail_search",
    connectorId: "mail",
    scope: "mail.read",
    description: "Søg i Kims indbakke. Returnerer højst 10 mails med id, afsender, emne, dato og et kort uddrag.",
    input: z.strictObject({
      query: z.string().max(200).optional().describe("Søgeord i emne, afsender eller tekst"),
      from: z.string().max(100).optional().describe("Afsenderens navn eller mail"),
      dayRange: z.number().int().min(1).max(90).optional().describe("Kun mails fra de seneste N dage"),
    }),
    run: (ctx, input) => {
      const hits = ctx.world.mail
        .filter((m) => matchesAll(`${m.subject} ${m.from.name} ${m.from.email} ${m.body}`, input.query))
        .filter((m) => !input.from || norm(`${m.from.name} ${m.from.email}`).includes(norm(input.from)))
        .filter((m) => input.dayRange === undefined || m.dayOffset >= -input.dayRange)
        .sort((a, b) => b.dayOffset - a.dayOffset || b.time.localeCompare(a.time));
      return {
        resultCount: hits.length,
        result: hits.slice(0, MAX_HITS).map((m) => ({ id: m.id, from: m.from.name, subject: m.subject, date: formatDayLabel(resolveDay(ctx.anchor, m.dayOffset)), time: m.time, excerpt: excerpt(m.body) })),
      };
    },
  }),
  def({
    name: "mail_read",
    connectorId: "mail",
    scope: "mail.read",
    description: "Læs én mail i Kims indbakke ud fra id (fx m08).",
    input: z.strictObject({ id: z.string().regex(/^m\d{2}$/) }),
    run: (ctx, input) => {
      const m = ctx.world.mail.find((x) => x.id === input.id);
      if (!m) return { resultCount: 0, result: { error: "Mailen findes ikke." } };
      const to = m.to.map((id) => ctx.world.employees.find((e) => e.id === id)?.name ?? id);
      return {
        resultCount: 1,
        result: { id: m.id, from: `${m.from.name} <${m.from.email}>`, to, subject: m.subject, date: formatDayLabel(resolveDay(ctx.anchor, m.dayOffset)), time: m.time, body: m.body, attachments: m.attachments ?? [] },
      };
    },
  }),
  def({
    name: "calendar_list",
    connectorId: "calendar",
    scope: "calendar.read",
    description: "List Kims kalenderaftaler fra dag dayFrom til dayTo (0 = i dag, 1 = i morgen).",
    input: z.strictObject({ dayFrom: z.number().int().min(-30).max(60), dayTo: z.number().int().min(-30).max(60) }),
    run: (ctx, input) => {
      const name = (id: string) => ctx.world.employees.find((e) => e.id === id)?.name ?? id;
      const hits = ctx.world.calendar.filter((c) => c.dayOffset >= input.dayFrom && c.dayOffset <= input.dayTo).sort((a, b) => a.dayOffset - b.dayOffset || a.start.localeCompare(b.start));
      return {
        resultCount: hits.length,
        result: hits.map((c) => ({ id: c.id, title: c.title, date: formatDayLabel(resolveDay(ctx.anchor, c.dayOffset)), start: c.start, end: c.end, attendees: [...c.attendees.map(name), ...(c.externalAttendees ?? [])], note: c.note ?? null })),
      };
    },
  }),
  def({
    name: "files_search",
    connectorId: "files",
    scope: "files.read",
    description: "Søg i Nordlys' filer på navn og indhold. Returnerer højst 10 filer med id, navn og uddrag.",
    input: z.strictObject({ query: z.string().max(200) }),
    run: (ctx, input) => {
      const hits = ctx.world.files.filter((f) => matchesAll(`${f.name} ${f.summary} ${ctx.world.fileBodies[f.id] ?? ""}`, input.query));
      return { resultCount: hits.length, result: hits.slice(0, MAX_HITS).map((f) => ({ id: f.id, name: f.name, summary: excerpt(f.summary) })) };
    },
  }),
  def({
    name: "files_read",
    connectorId: "files",
    scope: "files.read",
    description: "Læs en Nordlys-fil ud fra id (fx f02). Regnearket f15 læses med sheet_read.",
    input: z.strictObject({ id: z.string().regex(/^f\d{2}$/) }),
    run: (ctx, input) => {
      const f = ctx.world.files.find((x) => x.id === input.id);
      if (!f) return { resultCount: 0, result: { error: "Filen findes ikke." } };
      const body = ctx.world.fileBodies[f.id];
      return { resultCount: 1, result: body ? { id: f.id, name: f.name, content: body } : { id: f.id, name: f.name, hint: "Regneark — brug sheet_read." } };
    },
  }),
  def({
    name: "crm_query",
    connectorId: "crm",
    scope: "crm.read",
    description: "Find kunder i CRM med filtre (segment, status, by, branche, minimumsomsætning), sortering og højst 30 resultater.",
    input: z.strictObject({
      filter: crmFilter.optional(),
      sort: z.enum(["name", "annualRevenueDkk", "lastContactDayOffset", "nps"]).optional(),
      limit: z.number().int().min(1).max(30).optional(),
    }),
    run: (ctx, input) => {
      const f = input.filter ?? {};
      const values = ctx.state.crm.values;
      const rows = ctx.world.crm
        .map((k) => ({ ...k, ...(values[k.id] as Partial<typeof k> | undefined) }))
        .filter((k) => (!f.segment || k.segment === f.segment) && (!f.status || k.status === f.status))
        .filter((k) => (!f.city || norm(k.city) === norm(f.city)) && (!f.industry || norm(k.industry) === norm(f.industry)))
        .filter((k) => f.minRevenue === undefined || k.annualRevenueDkk >= f.minRevenue);
      const sort = input.sort;
      if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "da"));
      else if (sort) rows.sort((a, b) => Number(b[sort] ?? -Infinity) - Number(a[sort] ?? -Infinity));
      return {
        resultCount: rows.length,
        result: rows.slice(0, input.limit ?? 30).map((k) => ({ id: k.id, name: k.name, industry: k.industry, city: k.city, segment: k.segment, status: k.status, annualRevenueDkk: k.annualRevenueDkk, nps: k.nps, lastContactDayOffset: k.lastContactDayOffset })),
      };
    },
  }),
  def({
    name: "crm_get",
    connectorId: "crm",
    scope: "crm.read",
    description: "Hent én kunde fra CRM med kontakt, noter og åbne opgaver ud fra id (fx k12).",
    input: z.strictObject({ id: z.string().regex(/^k\d{2}$/) }),
    run: (ctx, input) => {
      const k = ctx.world.crm.find((x) => x.id === input.id);
      if (!k) return { resultCount: 0, result: { error: "Kunden findes ikke." } };
      return { resultCount: 1, result: { ...k, ...ctx.state.crm.values[k.id] } };
    },
  }),
  def({
    name: "sheet_read",
    connectorId: "sheet",
    scope: "sheet.read",
    description: 'Læs celler i regnearket "Budget 2026" (f15) i A1-format, fx "A1:H13" eller "F8". Kolonner: Post, Q1, Q2, Q3, Q4 (prognose), I alt, Budget, Afvigelse.',
    input: z.strictObject({ range: z.string().regex(/^[A-Ha-h]\d{1,2}(:[A-Ha-h]\d{1,2})?$/) }),
    run: (ctx, input) => {
      const all = buildSheetCells(ctx.world, ctx.state);
      const cells = expandRange(input.range).filter((c) => all[c]);
      return { resultCount: cells.length, result: Object.fromEntries(cells.map((c) => [c, all[c]])) };
    },
  }),
];

export type SandboxTool = (typeof TOOLS)[number];

/** Tools the model may use: only those whose scope the user granted on a connected connector. */
export function availableTools(state: SandboxState): SandboxTool[] {
  return TOOLS.filter((t) => {
    const c = state.connectors[t.connectorId];
    return c?.connected && c.scopes.includes(t.scope);
  });
}

export function toolJsonSchema(tool: SandboxTool): Record<string, unknown> {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(tool.input) as Record<string, unknown>;
  return schema;
}

export class ToolInputError extends Error {}

/** Validates the model's arguments and runs the tool against the session projection. */
export function executeTool(name: string, rawInput: unknown, ctx: ToolContext): ToolOutcome & { tool: SandboxTool; truncated: boolean } {
  const tool = availableTools(ctx.state).find((t) => t.name === name);
  if (!tool) throw new ToolInputError(`tool ${name} is not available`);
  const parsed = (tool.input as z.ZodType).safeParse(rawInput);
  if (!parsed.success) throw new ToolInputError(`invalid input for ${name}`);
  const input = parsed.data as Record<string, unknown>;
  const filtersUsed = Object.entries(input).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).map((sub) => `${k}${sub[0]?.toUpperCase()}${sub.slice(1)}`) : [k]));
  const outcome = (tool.run as (c: ToolContext, i: unknown) => Omit<ToolOutcome, "filtersUsed">)(ctx, input);
  let json = JSON.stringify(outcome.result);
  const truncated = json.length > MAX_RESULT_CHARS;
  if (truncated) json = JSON.stringify({ truncated: true, partial: json.slice(0, MAX_RESULT_CHARS) });
  return { tool, result: JSON.parse(json) as unknown, resultCount: outcome.resultCount, filtersUsed, truncated };
}
