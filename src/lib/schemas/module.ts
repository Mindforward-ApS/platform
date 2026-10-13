import { z } from "zod";

// Runtime contract for module JSON (ModuleVersion.content). Mirrors content/schema/module.schema.json
// (JSON Schema owns the field names, docs/05) and adds rules JSON Schema cannot express: READ ≤ 120 words,
// unique step ids. tests/unit/module-schema.test.ts proves both reject the same invalid fixtures.

const MODULE_ID = /^(core|feat|role|news|case|exam)-[a-z0-9]+(-[a-z0-9]+)*$/;
const LOCAL_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TARGET_ID = /^[a-z0-9-]+(\.[a-z0-9-]+){1,4}$/;
const FIELD_PATH = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+){0,5}$/;
const FORBIDDEN_PATH = /(^|\.)(__proto__|prototype|constructor)(\.|$)/;
const EVENT_TYPE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

export const READ_MAX_WORDS = 120;

/** Words in a Markdown READ body: markup and list numbers do not count. */
export function countWords(markdown: string): number {
  return markdown
    .replace(/[*_#>`[\]()]/g, " ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w) && !/^\d+\.$/.test(w)).length;
}

const moduleId = z.string().regex(MODULE_ID);
const localId = z.string().regex(LOCAL_ID).max(48);
const targetId = z.string().regex(TARGET_ID).max(80);
const sceneId = z.string().regex(LOCAL_ID).max(64);
const fieldPath = z
  .string()
  .regex(FIELD_PATH)
  .refine((p) => !FORBIDDEN_PATH.test(p), "forbidden path segment");

export const TRACK_KEYS = ["CHATGPT", "COPILOT", "CLAUDE", "GEMINI"] as const;
export const JOB_ROLES = ["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS"] as const;
const unique = <T>(arr: T[]) => new Set(arr).size === arr.length;

const hint = (level: 1 | 2 | 3) => z.strictObject({ level: z.literal(level), text: z.string().min(5).max(600) });
const hints = z.tuple([hint(1), hint(2), hint(3)]);

// ── Predicate (docs/05 § 3) ───────────────────────────────────────────────
const fieldCondition = z
  .strictObject({
    path: fieldPath,
    op: z.enum(["eq", "neq", "in", "contains", "startsWith", "exists", "gte", "lte", "lengthGte"]),
    value: z.unknown().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.op !== "exists" && !("value" in c)) ctx.addIssue({ code: "custom", message: "value required" });
    if (c.op === "in" && !(Array.isArray(c.value) && c.value.length > 0)) ctx.addIssue({ code: "custom", message: "in needs a non-empty array" });
    if (["gte", "lte", "lengthGte"].includes(c.op) && "value" in c && typeof c.value !== "number") ctx.addIssue({ code: "custom", message: "number required" });
    if (c.op === "startsWith" && "value" in c && typeof c.value !== "string") ctx.addIssue({ code: "custom", message: "string required" });
  });

const eventMatcher = z.strictObject({
  type: z.string().regex(EVENT_TYPE),
  target: targetId.optional(),
  where: z.array(fieldCondition).min(1).max(8).optional(),
});

export type Predicate =
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate }
  | { event: z.infer<typeof eventMatcher> }
  | { count: { event: z.infer<typeof eventMatcher>; op: "eq" | "gte" | "lte"; value: number } }
  | { sequence: z.infer<typeof eventMatcher>[] }
  | { state: z.infer<typeof fieldCondition> };

export const predicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.union([
    z.strictObject({ all: z.array(predicateSchema).min(1).max(10) }),
    z.strictObject({ any: z.array(predicateSchema).min(1).max(10) }),
    z.strictObject({ not: predicateSchema }),
    z.strictObject({ event: eventMatcher }),
    z.strictObject({ count: z.strictObject({ event: eventMatcher, op: z.enum(["eq", "gte", "lte"]), value: z.number().int().min(0) }) }),
    z.strictObject({ sequence: z.array(eventMatcher).min(2).max(10) }),
    z.strictObject({ state: fieldCondition }),
  ]),
);

// ── Claims (docs/06 § 6) ──────────────────────────────────────────────────
const sourceRef = z.strictObject({
  changeEventId: z.string(),
  snapshotId: z.string(),
  url: z.string().regex(/^https:\/\//),
  quote: z.string().min(1).max(300),
  charStart: z.number().int().min(0),
  charEnd: z.number().int().min(0),
});
const claim = z
  .strictObject({ text: z.string().max(400), kind: z.enum(["FACT", "GUIDANCE"]), sourceRef: sourceRef.optional() })
  .refine((c) => c.kind !== "FACT" || c.sourceRef, "FACT claims need a sourceRef");
const claims = z.array(claim).max(20);

// ── Steps ─────────────────────────────────────────────────────────────────
const base = {
  id: localId,
  title: z.string().min(2).max(80),
  mustPass: z.boolean().optional(),
  sourceRefs: z.array(localId).optional(),
};
const graded = { ...base, points: z.number().gt(0).max(100), hints };

const readStep = z.strictObject({
  ...base,
  type: z.literal("READ"),
  points: z.literal(0),
  hints: hints.optional(),
  body: z
    .string()
    .min(20)
    .max(1000)
    .refine((b) => countWords(b) <= READ_MAX_WORDS, `READ body must be at most ${READ_MAX_WORDS} words`),
  image: z.strictObject({ src: z.string(), alt: z.string().min(3) }).optional(),
  claims: claims.optional(),
});

const demoStep = z.strictObject({
  ...base,
  type: z.literal("DEMO"),
  points: z.literal(0),
  hints: hints.optional(),
  scene: sceneId,
  frames: z
    .array(z.strictObject({ target: targetId, action: z.enum(["HIGHLIGHT", "CLICK", "TYPE"]), text: z.string().max(500).optional(), caption: z.string().max(200) }))
    .min(1)
    .max(12),
});

const clickTaskStep = z.strictObject({
  ...graded,
  type: z.literal("CLICK_TASK"),
  instruction: z.string().min(5).max(400),
  scene: sceneId,
  assertion: predicateSchema,
  successMessage: z.string().max(300),
  timeoutHintSec: z.number().int().min(10).max(600).optional(),
});

const check = z
  .strictObject({
    kind: z.enum(["MIN_WORDS", "MAX_WORDS", "MIN_CHARS", "INCLUDES_ANY", "INCLUDES_ALL", "EXCLUDES_ALL", "NO_PII"]),
    severity: z.enum(["BLOCK", "WARN"]),
    message: z.string().max(300),
    value: z.number().int().min(1).optional(),
    terms: z.array(z.string().min(1).max(60)).min(1).max(40).optional(),
  })
  .superRefine((c, ctx) => {
    const numeric = ["MIN_WORDS", "MAX_WORDS", "MIN_CHARS"].includes(c.kind);
    const textual = ["INCLUDES_ANY", "INCLUDES_ALL", "EXCLUDES_ALL"].includes(c.kind);
    if (numeric && (c.value === undefined || c.terms !== undefined)) ctx.addIssue({ code: "custom", message: `${c.kind} needs value and no terms` });
    if (textual && (c.terms === undefined || c.value !== undefined)) ctx.addIssue({ code: "custom", message: `${c.kind} needs terms and no value` });
    if (c.kind === "NO_PII" && (c.value !== undefined || c.terms !== undefined)) ctx.addIssue({ code: "custom", message: "NO_PII takes no value/terms" });
  });

const promptTaskStep = z.strictObject({
  ...graded,
  type: z.literal("PROMPT_TASK"),
  instruction: z.string().min(5).max(600),
  scenario: z.string().min(5).max(1500),
  attachments: z.array(localId).optional(),
  maxChars: z.number().int().min(100).max(4000).optional(),
  maxSubmissions: z.number().int().min(1).max(5).optional(),
  runModelAfter: z.boolean().optional(),
  checks: z.array(check).max(10),
  rubric: z.strictObject({
    version: z.string().regex(/^[a-z0-9-]+\.v[0-9]+$/),
    passScore: z.number().min(0.3).max(1),
    criteria: z
      .array(z.strictObject({ id: localId, label: z.string().max(80), description: z.string().max(600), weight: z.union([z.literal(1), z.literal(2), z.literal(3)]), required: z.boolean() }))
      .min(2)
      .max(7),
  }),
  goldenSet: z.string().regex(/^content\/golden\/[a-z0-9-]+\/[a-z0-9-]+\.jsonl$/),
  exampleSolution: z.string().min(10).max(2000),
});

const quizStep = z
  .strictObject({
    ...graded,
    type: z.literal("QUIZ"),
    question: z.string().min(5).max(400),
    multiSelect: z.boolean(),
    shuffle: z.boolean().optional(),
    options: z.array(z.strictObject({ id: localId, text: z.string().max(300), correct: z.boolean(), feedback: z.string().max(300) })).min(2).max(6),
    explanation: z.string().max(600),
    claims: claims.optional(),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.correct).length;
    if (correct < 1) ctx.addIssue({ code: "custom", message: "at least one correct option" });
    if (!q.multiSelect && correct !== 1) ctx.addIssue({ code: "custom", message: "single-select needs exactly one correct option" });
  });

const spotErrorStep = z
  .strictObject({
    ...graded,
    type: z.literal("SPOT_ERROR"),
    instruction: z.string().max(400),
    userPrompt: z.string().max(600),
    referenceFacts: z.string().max(1500),
    segments: z
      .array(
        z
          .strictObject({
            id: localId,
            text: z.string().min(1).max(600),
            isError: z.boolean(),
            errorType: z.enum(["FACT", "INVENTED", "MATH", "OUTDATED", "POLICY", "TONE"]).optional(),
            explanation: z.string().max(400).optional(),
          })
          .refine((s) => !s.isError || (s.errorType && s.explanation), "error segments need errorType and explanation"),
      )
      .min(3)
      .max(20),
  })
  .refine((s) => s.segments.some((seg) => seg.isError), "at least one error segment");

const judgmentStep = z
  .strictObject({
    ...graded,
    type: z.literal("JUDGMENT"),
    category: z.enum(["DATA_SECURITY", "GDPR", "CONFIDENTIALITY", "AI_POLICY", "COPYRIGHT", "RESPONSIBLE_USE"]),
    scenario: z.string().max(1000),
    question: z.string().max(300),
    options: z.array(z.strictObject({ id: localId, text: z.string().max(300), verdict: z.enum(["CORRECT", "PARTIAL", "WRONG"]), feedback: z.string().max(400) })).min(2).max(5),
    explanation: z.string().max(800),
  })
  .superRefine((j, ctx) => {
    if (j.options.filter((o) => o.verdict === "CORRECT").length !== 1) ctx.addIssue({ code: "custom", message: "exactly one CORRECT option" });
    if ((j.category === "DATA_SECURITY" || j.category === "GDPR") && j.mustPass !== true) ctx.addIssue({ code: "custom", message: "DATA_SECURITY/GDPR must be mustPass" });
  });

export const stepSchema = z.discriminatedUnion("type", [readStep, demoStep, clickTaskStep, promptTaskStep, quizStep, spotErrorStep, judgmentStep]);
export type Step = z.infer<typeof stepSchema>;
export type StepType = Step["type"];

// ── Module ────────────────────────────────────────────────────────────────
export const moduleSchema = z
  .strictObject({
    $schema: z.string().optional(),
    schemaVersion: z.literal(1),
    id: moduleId.max(64),
    version: z.number().int().min(1),
    locale: z.literal("da-DK"),
    title: z.string().min(3).max(60),
    summary: z.string().min(10).max(200),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    type: z.enum(["CORE", "FEATURE", "NEWS", "ROLE"]),
    format: z.enum(["STANDARD", "CASE", "EXAM"]),
    tracks: z.array(z.enum(TRACK_KEYS)).min(1).refine(unique, "tracks must be unique"),
    requiresTier: z.enum(["COPILOT_CHAT", "COPILOT_M365", "unknown"]).nullable().optional(),
    roles: z.array(z.enum(JOB_ROLES)).refine(unique).optional(),
    concepts: z.array(z.enum(["ASSISTANTS", "CONNECTORS", "SCHEDULED_TASKS", "AGENTS", "PROMPTING", "FILES_AND_DATA", "SECURITY_PRIVACY", "OTHER"])).refine(unique).optional(),
    featureRefs: z.array(z.string().regex(/^[a-z0-9]+\.[a-z0-9-]+$/)).refine(unique).optional(),
    minutes: z.number().int().min(3).max(25),
    objectives: z.array(z.string().min(5).max(140)).min(2).max(3),
    prerequisites: z.array(moduleId).refine(unique).optional(),
    passThreshold: z.number().min(0.5).max(1),
    requiresVerification: z.boolean(),
    verifiedAt: z.iso.datetime().nullable().optional(),
    sources: z.array(z.strictObject({ id: localId, url: z.url().regex(/^https:\/\//), title: z.string().max(200), retrievedAt: z.iso.date() })).optional(),
    attribution: z.string().max(400).nullable().optional(),
    autoUpdatedAt: z.iso.date().nullable().optional(),
    steps: z.array(stepSchema).min(1).max(15),
  })
  .superRefine((m, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: "custom", message, path });
    if (m.tracks.includes("COPILOT") && !m.requiresTier) issue("COPILOT modules need requiresTier", ["requiresTier"]);
    if (m.type === "ROLE" && !(m.roles && m.roles.length > 0)) issue("ROLE modules need roles", ["roles"]);
    if (m.type === "NEWS") {
      m.steps.forEach((s, i) => {
        if (s.type !== "READ" && s.type !== "QUIZ") issue("NEWS modules may only contain READ and QUIZ", ["steps", i]);
        if (s.type === "READ" && !(s.claims && s.claims.length > 0)) issue("NEWS READ steps need claims", ["steps", i]);
      });
    }
    if (m.requiresVerification && m.type !== "NEWS" && !(m.sources && m.sources.length > 0)) issue("requiresVerification needs sources", ["sources"]);
    if (m.format === "STANDARD" && (m.minutes < 5 || m.minutes > 12)) issue("STANDARD modules are 5–12 minutes", ["minutes"]);
    if (m.requiresTier === "unknown" && m.type !== "NEWS") issue("requiresTier unknown only for NEWS", ["requiresTier"]);
    if (!unique(m.steps.map((s) => s.id))) issue("step ids must be unique", ["steps"]);
  });

export type ModuleContent = z.infer<typeof moduleSchema>;

/** Points a learner can earn (graded steps only). */
export function maxPoints(m: ModuleContent): number {
  return m.steps.reduce((sum, s) => sum + s.points, 0);
}
