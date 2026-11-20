import { z } from "zod";

// Forløb content (content/forloeb/forloeb.json). Text is used exactly as written there; this schema only checks shape.

export const courseStatusSchema = z.enum(["klar", "kommer-snart"]);
export type CourseStatusJson = z.infer<typeof courseStatusSchema>;

export const tryItSchema = z.discriminatedUnion("where", [
  z.object({ where: z.literal("oevemiljoe"), text: z.string().min(1), prefill: z.string().min(1).max(1000), fallbackText: z.string().min(1) }),
  z.object({ where: z.literal("tool"), text: z.string().min(1), prefill: z.null() }),
  z.object({ where: z.literal("offline"), text: z.string().min(1), prefill: z.null() }),
]);
export type TryIt = z.infer<typeof tryItSchema>;

export const quizSchema = z
  .object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).length(3),
    correctIndex: z.number().int().min(0).max(2),
  })
  .strict();

export const lessonContentSchema = z
  .object({
    know: z.array(z.string().min(1)).min(1),
    tryIt: tryItSchema,
    quiz: quizSchema,
  })
  .strict();
export type LessonContent = z.infer<typeof lessonContentSchema>;

const lessonSchema = z
  .object({
    id: z.string().regex(/^[a-z]+-l\d{2}-\d{2}$/),
    nr: z.string().regex(/^\d+\.\d+$/),
    title: z.string().min(1),
    minutes: z.number().int().positive(),
    badges: z.array(z.string().min(1)),
    status: courseStatusSchema,
    content: lessonContentSchema.optional(),
  })
  .strict()
  // A lesson that can be opened must have its text, exercise and check question.
  .refine((l) => l.status !== "klar" || l.content !== undefined, { message: "lesson with status klar needs content" });

const moduleSchema = z
  .object({
    id: z.string().regex(/^[a-z]+-m\d{2}$/),
    nr: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().min(1),
    status: courseStatusSchema,
    lessons: z.array(lessonSchema).min(1),
  })
  .strict();

const testSchema = z
  .object({
    id: z.string().regex(/^[a-z]+-t\d$/),
    title: z.string().min(1),
    description: z.string().min(1),
    minutes: z.number().int().positive(),
    passPercent: z.number().int().min(1).max(100),
    status: courseStatusSchema,
  })
  .strict();

const levelSchema = z
  .object({
    id: z.string().regex(/^[a-z]+-n\d$/),
    nr: z.number().int().positive(),
    name: z.string().min(1),
    title: z.string().min(1),
    outcome: z.string().min(1),
    test: testSchema,
    modules: z.array(moduleSchema).min(1),
  })
  .strict();

export const courseTrackSchema = z
  .object({
    id: z.enum(["chatgpt", "claude", "copilot"]),
    toolName: z.string().min(1),
    toolUrl: z.url(),
    headline: z.string().min(1),
    disclaimer: z.string().min(1),
    status: courseStatusSchema,
    levels: z.array(levelSchema).min(1),
  })
  .strict();

export const courseFileSchema = z.object({ tracks: z.array(courseTrackSchema).min(1) }).strict();
export type CourseFile = z.infer<typeof courseFileSchema>;
export type CourseTrackJson = z.infer<typeof courseTrackSchema>;
