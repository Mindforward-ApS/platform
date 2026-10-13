import { z } from "zod";
import { normalizeText, parseDate, type ParsedEntry } from "../normalize";
import type { ParserConfig } from "../sources";
import { htmlFragmentToText } from "./html";

// Microsoft release communications API (M365 roadmap). External API response → Zod (CLAUDE.md), loosely: unknown
// fields pass through, required ones are checked.

const tag = z.object({ tagName: z.string() }).loose();
const item = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string(),
    description: z.string().nullish(),
    status: z.string().nullish(),
    moreInfoLink: z.string().nullish(),
    publicDisclosureAvailabilityDate: z.string().nullish(),
    publicPreviewDate: z.string().nullish(),
    created: z.string().nullish(),
    modified: z.string().nullish(),
    tagsContainer: z
      .object({
        products: z.array(tag).optional(),
        cloudInstances: z.array(tag).optional(),
        releasePhase: z.array(tag).optional(),
        platforms: z.array(tag).optional(),
      })
      .loose()
      .nullish(),
  })
  .loose();
const payload = z.union([z.array(item), z.object({ value: z.array(item) }).transform((v) => v.value)]);

/** Values at a dot path; `name[]` flattens arrays (e.g. "tagsContainer.products[].tagName"). */
export function valuesAt(obj: unknown, path: string): unknown[] {
  let current: unknown[] = [obj];
  for (const raw of path.split(".")) {
    const isArray = raw.endsWith("[]");
    const key = isArray ? raw.slice(0, -2) : raw;
    current = current.flatMap((v) => {
      const next = v && typeof v === "object" ? (v as Record<string, unknown>)[key] : undefined;
      return isArray ? (Array.isArray(next) ? next : []) : next === undefined ? [] : [next];
    });
  }
  return current;
}

const names = (tags: { tagName: string }[] | undefined) => (tags ?? []).map((t) => t.tagName).join(", ");

export function parseJson(raw: string, config: ParserConfig, baseUrl: string): ParsedEntry[] {
  const items = payload.parse(JSON.parse(raw));
  const filter = config.jsonFilter;
  const host = new URL(baseUrl).origin;
  return items
    .filter((i) => !filter || valuesAt(i, filter.field).some((v) => typeof v === "string" && filter.includes.some((inc) => v.includes(inc))))
    .map((i) => {
      const lines = [
        normalizeText(htmlFragmentToText(i.description ?? "")),
        i.status ? `Status: ${i.status}` : "",
        names(i.tagsContainer?.releasePhase) ? `Release phase: ${names(i.tagsContainer?.releasePhase)}` : "",
        names(i.tagsContainer?.products) ? `Products: ${names(i.tagsContainer?.products)}` : "",
        names(i.tagsContainer?.platforms) ? `Platforms: ${names(i.tagsContainer?.platforms)}` : "",
        names(i.tagsContainer?.cloudInstances) ? `Cloud instances: ${names(i.tagsContainer?.cloudInstances)}` : "",
        i.publicDisclosureAvailabilityDate ? `Rollout start: ${i.publicDisclosureAvailabilityDate}` : "",
        i.publicPreviewDate ? `Preview: ${i.publicPreviewDate}` : "",
      ].filter(Boolean);
      const date = (i.modified ?? i.created ?? "").slice(0, 10);
      return {
        entryKey: `m365-${String(i.id)}`,
        date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : parseDate(i.publicDisclosureAvailabilityDate ?? ""),
        title: normalizeText(i.title),
        text: normalizeText(lines.join("\n")),
        url: `${host}/microsoft-365/roadmap?id=${encodeURIComponent(String(i.id))}`,
      };
    })
    .filter((e) => e.text.length > 0);
}
