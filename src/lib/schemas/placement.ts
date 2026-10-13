import { z } from "zod";

// Placement test files (content/placement/<track>.v1.json) and the module catalog (content/placement/catalog.v1.json).
// The test is data: no LLM, option ids only (docs/03 § 5 PlacementResult.answers).

export const AREA_IDS = ["MODEL", "PROMPTING", "FACT_CHECK", "DATA_SECURITY", "ADVANCED"] as const;
export type AreaId = (typeof AREA_IDS)[number];

const TRACK_KEYS = ["CHATGPT", "COPILOT", "CLAUDE", "GEMINI"] as const;
const JOB_ROLES = ["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS", "OTHER"] as const;
const LICENSE_TIERS = ["COPILOT_CHAT", "COPILOT_M365", "UNKNOWN"] as const;
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const unique = <T>(xs: T[]) => new Set(xs).size === xs.length;

const option = z.strictObject({ id: z.string().regex(/^[a-z]$/), text: z.string().min(1).max(300) });

const question = z
  .strictObject({
    id: z.string().regex(/^q\d{2}$/),
    area: z.enum(AREA_IDS),
    type: z.enum(["QUIZ", "SPOT_ERROR", "JUDGMENT"]),
    prompt: z.string().min(5).max(400),
    context: z.string().min(5).max(600).optional(),
    options: z.array(option).min(2).max(5),
    correct: z.string(),
    estimatedSeconds: z.number().int().min(5).max(90),
  })
  .superRefine((q, ctx) => {
    if (!unique(q.options.map((o) => o.id))) ctx.addIssue({ code: "custom", message: "option ids must be unique", path: ["options"] });
    if (!q.options.some((o) => o.id === q.correct)) ctx.addIssue({ code: "custom", message: "correct must be an option id", path: ["correct"] });
    if (q.type === "SPOT_ERROR" && !q.context) ctx.addIssue({ code: "custom", message: "SPOT_ERROR needs context (the AI answer)", path: ["context"] });
  });

const profileQuestion = z.discriminatedUnion("kind", [
  z.strictObject({
    id: z.literal("jobRole"),
    kind: z.literal("JOB_ROLE"),
    question: z.string().min(5),
    help: z.string().optional(),
    required: z.boolean(),
    options: z.array(z.strictObject({ id: z.enum(JOB_ROLES), text: z.string().min(1) })).min(2),
  }),
  z.strictObject({
    id: z.literal("licenseTier"),
    kind: z.literal("LICENSE_TIER"),
    question: z.string().min(5),
    help: z.string().optional(),
    required: z.boolean(),
    options: z.array(z.strictObject({ id: z.enum(LICENSE_TIERS), text: z.string().min(1) })).min(2),
  }),
]);

const area = z.strictObject({
  id: z.enum(AREA_IDS),
  label: z.string().min(2),
  moduleIds: z.array(id),
  advice: z.strictObject({ improve: z.string().min(10).max(300), next: z.string().min(10).max(300) }),
});

export const placementTestSchema = z
  .strictObject({
    $comment: z.string().optional(),
    id: z.string().regex(/^placement-[a-z]+$/),
    version: z.number().int().min(1),
    track: z.enum(TRACK_KEYS),
    locale: z.literal("da-DK"),
    title: z.string().min(5),
    intro: z.string().min(5),
    areas: z.array(area).length(AREA_IDS.length),
    profileQuestions: z.array(profileQuestion),
    questions: z.array(question).min(1),
  })
  .superRefine((t, ctx) => {
    if (!unique(t.areas.map((a) => a.id))) ctx.addIssue({ code: "custom", message: "every area exactly once", path: ["areas"] });
    if (!unique(t.questions.map((q) => q.id))) ctx.addIssue({ code: "custom", message: "question ids must be unique", path: ["questions"] });
    for (const a of t.areas) {
      if (!t.questions.some((q) => q.area === a.id)) ctx.addIssue({ code: "custom", message: `area ${a.id} has no question`, path: ["areas"] });
    }
    if (!t.profileQuestions.some((p) => p.kind === "JOB_ROLE")) ctx.addIssue({ code: "custom", message: "every track asks the job role", path: ["profileQuestions"] });
    const asksTier = t.profileQuestions.some((p) => p.kind === "LICENSE_TIER");
    if (t.track === "COPILOT" && !asksTier) ctx.addIssue({ code: "custom", message: "COPILOT asks the license tier", path: ["profileQuestions"] });
    if (t.track !== "COPILOT" && asksTier) ctx.addIssue({ code: "custom", message: "only COPILOT asks the license tier", path: ["profileQuestions"] });
  });

export type PlacementTest = z.infer<typeof placementTestSchema>;
export type PlacementQuestion = PlacementTest["questions"][number];

export const catalogModuleSchema = z.strictObject({
  id,
  title: z.string().min(3),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  type: z.enum(["CORE", "FEATURE", "ROLE"]),
  tracks: z.array(z.enum(TRACK_KEYS)).min(1),
  requiresTier: z.enum(["COPILOT_CHAT", "COPILOT_M365"]).nullable(),
  roles: z.array(z.enum(JOB_ROLES)),
  minutes: z.number().int().min(1).max(60),
});

export const catalogSchema = z
  .strictObject({
    $comment: z.string().optional(),
    version: z.number().int().min(1),
    source: z.string(),
    modules: z.array(catalogModuleSchema).min(1),
  })
  .superRefine((c, ctx) => {
    if (!unique(c.modules.map((m) => m.id))) ctx.addIssue({ code: "custom", message: "module ids must be unique", path: ["modules"] });
    c.modules.forEach((m, i) => {
      if (m.type === "ROLE" && m.roles.length === 0) ctx.addIssue({ code: "custom", message: "ROLE modules need roles", path: ["modules", i] });
    });
  });

export type Catalog = z.infer<typeof catalogSchema>;

/** What a learner submits: option ids only (no free text). */
export const placementAnswersSchema = z.strictObject({
  profile: z.strictObject({
    jobRole: z.enum(JOB_ROLES).nullable(),
    licenseTier: z.enum(LICENSE_TIERS).nullable(),
  }),
  questions: z.record(z.string().regex(/^q\d{2}$/), z.string().regex(/^[a-z]$/)),
});

export type PlacementAnswers = z.infer<typeof placementAnswersSchema>;
