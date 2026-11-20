// What an org admin may NEVER receive (docs/03 § 5, docs/01 § 7, docs/10 § 1.6): learners' free text,
// AI feedback, sandbox content, rubric details, placement answers, structured step answers, timing per step.
// src/server/admin/queries.ts must select explicit allow-listed fields only; tests scan its source and its output.

export const ADMIN_FORBIDDEN_KEYS = [
  "promptText",
  "aiFeedback",
  "contentText",
  "rubricScores",
  "answers",
  "answer",
  "checksReport",
  "flags",
  "durationSeconds",
  "stepResults",
  "sandboxEvents",
] as const;

const FORBIDDEN = new Set<string>(ADMIN_FORBIDDEN_KEYS);

/** Deep scan of a value (query result, export row, JSON response) for forbidden keys. Returns their paths. */
export function findForbiddenKeys(value: unknown, path = "$", seen = new WeakSet<object>()): string[] {
  if (value === null || typeof value !== "object") return [];
  if (value instanceof Date) return [];
  if (seen.has(value)) return [];
  seen.add(value);
  const hits: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => hits.push(...findForbiddenKeys(v, `${path}[${i}]`, seen)));
    return hits;
  }
  for (const [key, v] of Object.entries(value)) {
    if (FORBIDDEN.has(key)) hits.push(`${path}.${key}`);
    hits.push(...findForbiddenKeys(v, `${path}.${key}`, seen));
  }
  return hits;
}

export function assertAdminSafe<T>(value: T): T {
  const hits = findForbiddenKeys(value);
  if (hits.length > 0) throw new Error(`Admin data contains forbidden fields: ${hits.join(", ")}`);
  return value;
}
