import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseConnectorContent, type ConnectorContent } from "@/lib/schemas/connectors";

// Reads and validates content/connectors/*.json (seed + `pnpm content:validate`). Runtime reads the database.

const FILES = {
  industries: "industries.json",
  tasks: "tasks.json",
  systems: "systems.json",
  connectors: "connectors.json",
  availability: "availability.json",
  profiles: "industry-profiles.json",
  demos: "demos.json",
} as const;

export function loadConnectorContent(dir = join(process.cwd(), "content/connectors")): ConnectorContent {
  const raw = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, JSON.parse(readFileSync(join(dir, f), "utf8")) as unknown])) as Record<keyof ConnectorContent, unknown>;
  return parseConnectorContent(raw);
}
