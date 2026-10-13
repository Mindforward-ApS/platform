// Line diff for the review screen: what changed between the previous ModuleVersion and the draft.

export type DiffLine = { op: "same" | "add" | "del"; text: string };

/** Learner-visible module text as lines (title, summary, steps), in order. Works on unvalidated JSON too. */
export function moduleLines(content: unknown): string[] {
  if (!content || typeof content !== "object") return [];
  const c = content as Record<string, unknown>;
  const lines: string[] = [];
  const push = (label: string, v: unknown) => {
    if (typeof v === "string" && v.trim()) for (const l of v.split("\n")) if (l.trim()) lines.push(`${label}: ${l.trim()}`);
  };
  push("Titel", c.title);
  push("Resumé", c.summary);
  if (Array.isArray(c.objectives)) c.objectives.forEach((o) => push("Mål", o));
  if (Array.isArray(c.steps)) {
    for (const raw of c.steps) {
      if (!raw || typeof raw !== "object") continue;
      const s = raw as Record<string, unknown>;
      const id = String(s.id ?? "?");
      push(`[${id}] ${String(s.type ?? "")}`, s.title);
      push(`[${id}]`, s.body);
      push(`[${id}] Spørgsmål`, s.question);
      if (Array.isArray(s.options)) for (const o of s.options) if (o && typeof o === "object") push(`[${id}] ${(o as { correct?: boolean }).correct ? "✓" : "·"}`, (o as { text?: unknown }).text);
      push(`[${id}] Forklaring`, s.explanation);
    }
  }
  return lines;
}

/** LCS-based line diff (modules are small: O(n·m) is fine). */
export function diffLines(before: string[], after: string[]): DiffLine[] {
  const n = before.length;
  const m = after.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i]![j] = before[i] === after[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      out.push({ op: "same", text: before[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) out.push({ op: "del", text: before[i++]! });
    else out.push({ op: "add", text: after[j++]! });
  }
  while (i < n) out.push({ op: "del", text: before[i++]! });
  while (j < m) out.push({ op: "add", text: after[j++]! });
  return out;
}
