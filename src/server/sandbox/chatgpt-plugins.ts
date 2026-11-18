import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CONNECTOR_IDS } from "./events";

// The plugin directory of the sidebar-chat track's tool (public plugins as seen 26 Oct 2026), names and short
// descriptions as TEXT only (00-beslutninger § 10e/§ 10g). `data` = the Nordlys practice data a plugin reaches.

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40);
const file = z.strictObject({
  source: z.string(),
  plugins: z.array(z.strictObject({ id, name: z.string().min(1).max(80), description: z.string().min(1).max(120), data: z.array(z.enum(CONNECTOR_IDS)).max(5) })).min(1).max(500),
  sections: z.array(z.strictObject({ title: z.string().min(1).max(40), ids: z.array(id).min(1) })).min(1).max(40),
});

export interface PluginDirectory {
  items: { id: string; name: string; madeBy: string; description: string; categories: string[]; data: (typeof CONNECTOR_IDS)[number][]; featured: number }[];
  sections: { title: string; ids: string[] }[];
}

let cache: PluginDirectory | undefined;
export function loadPluginDirectory(): PluginDirectory {
  if (!cache) {
    const f = file.parse(JSON.parse(readFileSync(join(process.cwd(), "content/sandbox-connectors/chatgpt-plugins.json"), "utf8")));
    const first = f.sections[0]?.ids ?? [];
    cache = {
      sections: f.sections,
      items: f.plugins.map((p) => ({
        ...p,
        madeBy: "",
        categories: f.sections.filter((s) => s.ids.includes(p.id)).map((s) => s.title),
        featured: first.includes(p.id) ? first.indexOf(p.id) + 1 : 0,
      })),
    };
  }
  return cache;
}
