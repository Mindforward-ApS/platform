"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthzError, requireActiveMembership } from "@/server/auth/authz";
import { answerLesson } from "@/server/courses/service";
import { db } from "@/server/db";

// Forløb: answer a lesson's check question. Authenticates first; progress is stored for this user in the active org.

const input = z.object({
  lessonSlug: z.string().regex(/^[a-z]+-l\d{2}-\d{2}$/),
  chosenIndex: z.number().int().min(0).max(9),
});

export type AnswerLessonResult = { ok: true; correct: boolean } | { ok: false; error: "INVALID" | "NOT_FOUND" | "LOCKED" | "UNAUTHORIZED" };

export async function answerLessonQuestion(lessonSlug: string, chosenIndex: number): Promise<AnswerLessonResult> {
  let ctx;
  try {
    ctx = await requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]);
  } catch (err) {
    if (err instanceof AuthzError) return { ok: false, error: "UNAUTHORIZED" };
    throw err;
  }
  const parsed = input.safeParse({ lessonSlug, chosenIndex });
  if (!parsed.success) return { ok: false, error: "INVALID" };
  const result = await answerLesson(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, parsed.data.lessonSlug, parsed.data.chosenIndex);
  if (result.ok && result.correct) revalidatePath("/forloeb", "layout");
  return result;
}
