import { z } from "zod";
import { sandboxEventInputSchema } from "./events";

/** JSON Schema for the SandboxEvent envelope, generated from Zod (docs/04 § 9). Written by `pnpm sandbox:schema`. */
export function buildSandboxEventJsonSchema(): unknown {
  const schema = z.toJSONSchema(sandboxEventInputSchema, { target: "draft-2020-12", unrepresentable: "any" }) as Record<string, unknown>;
  return { $id: "sandbox-event.schema.json", title: "SandboxEvent (generated from src/server/sandbox/events.ts, do not edit)", ...schema };
}
