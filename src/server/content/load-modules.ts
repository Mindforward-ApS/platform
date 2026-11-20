import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { maxPoints, moduleSchema, type ModuleContent } from "@/lib/schemas/module";

// Reads content/modules/*.json (CORE/FEATURE/ROLE; NEWS come from the content engine in M9).

export interface LoadedModule {
  content: ModuleContent;
  contentHash: string;
  maxPoints: number;
  /** A module is publishable only when every PROMPT_TASK has its golden set (docs/05 § 4.3). */
  goldenSetsComplete: boolean;
  searchText: string;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((k) => k !== "$schema")
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashContent(content: unknown): string {
  return createHash("sha256").update(canonical(content)).digest("hex");
}

function searchTextOf(m: ModuleContent): string {
  const parts: string[] = [m.title, m.summary, ...m.objectives];
  for (const s of m.steps) {
    parts.push(s.title);
    if (s.type === "READ") parts.push(s.body);
    if (s.type === "PROMPT_TASK" || s.type === "CLICK_TASK") parts.push(s.instruction);
    if (s.type === "QUIZ" || s.type === "JUDGMENT") parts.push(s.question);
  }
  return parts.join("\n");
}

export function loadModules(root = "content"): LoadedModule[] {
  const dir = join(root, "modules");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const content = moduleSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8")));
      const goldenSetsComplete = content.steps.every((s) => s.type !== "PROMPT_TASK" || existsSync(s.goldenSet));
      return { content, contentHash: hashContent(content), maxPoints: maxPoints(content), goldenSetsComplete, searchText: searchTextOf(content) };
    });
}
