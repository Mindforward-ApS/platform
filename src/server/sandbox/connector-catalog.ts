import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CONNECTOR_IDS } from "./events";

// Claude's connector directory (claude.com/marketplace, remote connectors, fetched 26 Oct 2026) for the sandbox
// catalog. Real names as TEXT only — no logos, colours or URLs (decision Marco 26 Oct 2026, 00-beslutninger § 10e).
// Nothing connects to the real service: `data` says which Nordlys practice data a connector reaches; [] = none.

const entry = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40),
  name: z.string().min(1).max(120),
  madeBy: z.string().min(1).max(120),
  categories: z.array(z.string().min(1).max(40)).min(1).max(8),
  data: z.array(z.enum(CONNECTOR_IDS)).max(5),
  featured: z.number().int().min(0).max(50),
});
const file = z.strictObject({ source: z.string(), connectors: z.array(entry).min(1).max(2000) });
export type CatalogConnector = z.infer<typeof entry>;

let cache: CatalogConnector[] | undefined;
export function loadConnectorCatalog(): CatalogConnector[] {
  cache ??= file.parse(JSON.parse(readFileSync(join(process.cwd(), "content/sandbox-connectors/catalog.json"), "utf8"))).connectors;
  return cache;
}
