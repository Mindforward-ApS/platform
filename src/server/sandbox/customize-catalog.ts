import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// Skills and plugins for the "Tilpasning" view (names as seen in the real tool on 26 Oct 2026, text only).
// Adding one only records it in the session; nothing is installed anywhere.

const ICONS = ["file", "table", "grid", "sparkle", "mail", "plan", "building", "search", "users", "chart", "check", "calendar", "lightning", "chat"] as const;
const entry = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40),
  name: z.string().min(1).max(80),
  madeBy: z.string().min(1).max(80),
  section: z.enum(["forYou", "new", "popular"]),
  icon: z.enum(ICONS),
  description: z.string().min(1).max(200),
});
const file = z.strictObject({ source: z.string(), skills: z.array(entry).min(1).max(200), plugins: z.array(entry).min(1).max(200) });
export type CustomizeCatalog = Omit<z.infer<typeof file>, "source">;

const cache = new Map<string, CustomizeCatalog>();
/** "catalog" = the workpane track's Tilpasning, "cowork" = the work-chat track's Tilpas. */
export function loadCustomizeCatalog(name: "catalog" | "cowork" = "catalog"): CustomizeCatalog {
  let c = cache.get(name);
  if (!c) {
    const { skills, plugins } = file.parse(JSON.parse(readFileSync(join(process.cwd(), `content/sandbox-customize/${name}.json`), "utf8")));
    c = { skills, plugins };
    cache.set(name, c);
  }
  return c;
}
