import type { z } from "zod";

export class EnvValidationError extends Error {
  constructor(
    public readonly variables: string[],
    details: string,
  ) {
    super(`Ugyldige eller manglende miljøvariabler: ${variables.join(", ")}\n${details}`);
    this.name = "EnvValidationError";
  }
}

export function parseWith<T extends z.ZodType>(schema: T, source: Record<string, string | undefined>): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const variables = [...new Set(result.error.issues.map((i) => String(i.path[0] ?? "?")))];
  const details = result.error.issues.map((i) => `  - ${String(i.path[0] ?? "?")}: ${i.message}`).join("\n");
  throw new EnvValidationError(variables, details);
}

