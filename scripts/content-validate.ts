import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { moduleSchema, type ModuleContent, type Predicate } from "../src/lib/schemas/module";
import { worldSchema, type World } from "../src/lib/schemas/world";
import { validatePlacementContent } from "./placement-validate";
import { loadArticles } from "../src/server/support/help";
import { loadConnectorContent } from "../src/server/connectors/content";

// `pnpm content:validate` (CI): every module passes JSON Schema AND Zod, references only existing Nordlys
// files and known sandbox event types, and the seed world is valid. Exit code 1 on any error.

const CONTENT = "content";
const SANDBOX_EVENT_TYPES = new Set(
  readFileSync("prisma/schema.prisma", "utf8")
    .match(/enum SandboxEventType \{([^}]*)\}/)?.[1]
    ?.split("\n")
    .map((l) => l.trim().split(/\s/)[0])
    .filter((t): t is string => Boolean(t && /^[A-Z_]+$/.test(t))) ?? [],
);

const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
const ajv = new Ajv2020({ allErrors: true, strict: false });
(addFormats as unknown as (a: Ajv2020) => void)(ajv);
const jsonSchema = JSON.parse(readFileSync(join(CONTENT, "schema/module.schema.json"), "utf8")) as object;
const validateJson = ajv.compile(jsonSchema);

export function validateWithJsonSchema(data: unknown): { valid: boolean; errors: string[] } {
  const valid = validateJson(data) as boolean;
  return { valid, errors: valid ? [] : (validateJson.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? ""}`) };
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function loadWorld(dir = join(CONTENT, "sandbox-world")): { world?: World; errors: string[] } {
  const raw = {
    version: readFileSync(join(dir, "world.version"), "utf8").trim(),
    company: readJson(join(dir, "company.json")),
    employees: readJson(join(dir, "employees.json")),
    mail: existsSync(join(dir, "mail.json")) ? readJson(join(dir, "mail.json")) : [],
    calendar: readJson(join(dir, "calendar.json")),
    files: readJson(join(dir, "files.json")),
    crm: readJson(join(dir, "crm.json")),
    budget: readJson(join(dir, "budget.json")),
  };
  const parsed = worldSchema.safeParse(raw);
  if (!parsed.success) return { errors: parsed.error.issues.slice(0, 20).map((i) => `sandbox-world ${i.path.join(".")}: ${i.message}`) };
  const errors = parsed.data.files.filter((f) => f.path && !existsSync(join(dir, f.path))).map((f) => `sandbox-world: ${f.id} missing ${f.path}`);
  return { world: parsed.data, errors };
}

function eventTypes(p: Predicate): string[] {
  if ("all" in p) return p.all.flatMap(eventTypes);
  if ("any" in p) return p.any.flatMap(eventTypes);
  if ("not" in p) return eventTypes(p.not);
  if ("event" in p) return [p.event.type];
  if ("count" in p) return [p.count.event.type];
  if ("sequence" in p) return p.sequence.map((e) => e.type);
  return [];
}

function referencedFileIds(m: ModuleContent): string[] {
  return m.steps.flatMap((s) => (s.type === "PROMPT_TASK" ? (s.attachments ?? []) : []));
}

export function validateModule(data: unknown, world: World | undefined, label: string): string[] {
  const errors = validateWithJsonSchema(data).errors.map((e) => `${label} [json-schema] ${e}`);
  const parsed = moduleSchema.safeParse(data);
  if (!parsed.success) {
    errors.push(...parsed.error.issues.map((i) => `${label} [zod] ${i.path.join(".")}: ${i.message}`));
    return errors;
  }
  const m = parsed.data;
  for (const s of m.steps) {
    if (s.type !== "CLICK_TASK") continue;
    for (const t of eventTypes(s.assertion)) if (!SANDBOX_EVENT_TYPES.has(t)) errors.push(`${label} step ${s.id}: unknown event type ${t}`);
  }
  if (world) {
    const fileIds = new Set(world.files.map((f) => f.id));
    for (const f of referencedFileIds(m)) if (!fileIds.has(f)) errors.push(`${label}: attachment ${f} is not a Nordlys file`);
  }
  return errors;
}

function main() {
  const { world, errors } = loadWorld();
  const moduleDir = join(CONTENT, "modules");
  const files = readdirSync(moduleDir).filter((f) => f.endsWith(".json"));
  const ids = new Set<string>();
  for (const f of files) {
    const data = readJson(join(moduleDir, f)) as { id?: string };
    if (data.id && `${data.id}.json` !== f) errors.push(`${f}: file name must be <id>.json`);
    if (data.id) ids.add(data.id);
    errors.push(...validateModule(data, world, f));
  }
  const placement = validatePlacementContent();
  errors.push(...placement.errors);
  // M10: help-center articles (frontmatter, slug = file name, related links, price tokens).
  let helpCount = 0;
  try {
    helpCount = loadArticles().length;
  } catch (err) {
    errors.push(`content/help: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Connector recommendations: industries, codes, connectors, availability with sources, demos.
  let industryCount = 0;
  try {
    industryCount = loadConnectorContent().industries.length;
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    console.error(`\ncontent:validate: ${errors.length} fejl`);
    process.exit(1);
  }
  console.log(`content:validate: OK (${files.length} moduler, ${placement.tests} niveautests, ${helpCount} hjælpeartikler, ${industryCount} brancher, Nordlys-verden v${world?.version})`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
