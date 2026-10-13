// Client-facing shapes of the module player. Only `import type` these from client components.
// Built exclusively by ./sanitize.ts, which decides what may leave the server (docs/05 § 7).

import type { StepStatus } from "./attempt-rules";

export interface PlayerHint {
  level: 1 | 2 | 3;
  text: string;
}

export interface PlayerCriterion {
  id: string;
  label: string;
  /** 0–2, only after a graded submission. */
  score?: 0 | 1 | 2;
  /** Model feedback for the owner (free text, purged after 30 days). */
  feedback?: string;
}

export interface PlayerStepResult {
  gradingStatus: "PENDING" | "GRADED" | "ERROR";
  /** Rounded for display; the module score is computed with full precision. */
  points: number;
  maxPoints: number;
  passed: boolean;
  tryCount: number;
  /** The learner's own structured answer (ids only). */
  answer: unknown;
  /** PROMPT_TASK only. */
  submissionsLeft?: number;
  blockedMessage?: string;
  warnings?: string[];
  overallFeedback?: string;
}

interface StepBase {
  id: string;
  title: string;
  points: number;
  mustPass: boolean;
  status: StepStatus;
  hintLevelUsed: number;
  /** Only hint levels the learner has taken. */
  hints: PlayerHint[];
  /** Graded steps have 3 hints. */
  hintCount: number;
  result?: PlayerStepResult;
}

export type PlayerStep =
  | (StepBase & { type: "READ"; body: string; image?: { src: string; alt: string } })
  | (StepBase & { type: "DEMO"; scene: string; frames: { target: string; action: "HIGHLIGHT" | "CLICK" | "TYPE"; text?: string; caption: string }[] })
  | (StepBase & { type: "CLICK_TASK"; instruction: string; scene: string; timeoutHintSec?: number; successMessage?: string })
  | (StepBase & {
      type: "PROMPT_TASK";
      instruction: string;
      scenario: string;
      attachments: string[];
      maxChars: number;
      maxSubmissions: number;
      /** Labels only (never descriptions), after the first submission. */
      criteria?: PlayerCriterion[];
      /** After hint 3 or after passing. */
      exampleSolution?: string;
      /** The owner's own last counted prompt (until purged after 30 days), so the textarea keeps it (WCAG 3.3.7). */
      lastSubmission?: string;
    })
  | (StepBase & {
      type: "QUIZ";
      question: string;
      multiSelect: boolean;
      options: { id: string; text: string; correct?: boolean; feedback?: string }[];
      explanation?: string;
    })
  | (StepBase & {
      type: "SPOT_ERROR";
      instruction: string;
      userPrompt: string;
      referenceFacts: string;
      segments: { id: string; text: string; isError?: boolean; errorType?: string; explanation?: string }[];
    })
  | (StepBase & {
      type: "JUDGMENT";
      category: string;
      scenario: string;
      question: string;
      options: { id: string; text: string; verdict?: "CORRECT" | "PARTIAL" | "WRONG"; feedback?: string }[];
      explanation?: string;
    });

export interface PlayerResult {
  scorePct: number;
  passed: boolean;
  passThresholdPct: number;
  mustPassFailed: { stepId: string; title: string }[];
  steps: { stepId: string; title: string; type: string; points: number; maxPoints: number; passed: boolean }[];
}

export interface PlayerState {
  attemptId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  module: { slug: string; title: string; summary: string; minutes: number; maxPoints: number; passThresholdPct: number };
  steps: PlayerStep[];
  canFinish: boolean;
  result?: PlayerResult;
}

/** What a server action returns to the player. */
export type PlayerActionResult =
  | { ok: true; state: PlayerState; notice?: "PII_REJECTED" | "GRADING_ERROR" | "CLICK_NOT_YET" | "CLICK_UNAVAILABLE" }
  | { ok: false; error: string };
