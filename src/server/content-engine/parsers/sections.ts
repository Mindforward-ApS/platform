import { fallbackKey, isDateHeading, normalizeText, parseDate, slugify, type ParsedEntry } from "../normalize";

// Shared by the HTML and Markdown parsers: a linear stream of headings and text blocks becomes entries.
// A heading that is only a date ("October 9, 2026") sets the date for the headings below it; if text follows it
// directly, it is an entry itself (titled by the date).

export type Block = { kind: "heading"; level: number; text: string; id?: string } | { kind: "text"; text: string };

export function blocksToEntries(blocks: Block[], opts: { entryLevels: number[]; baseUrl: string }): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  let currentDate: string | null = null;
  let dateLevel = 0;
  let open: { title: string; date: string | null; id?: string; lines: string[] } | null = null;

  const close = () => {
    if (!open) return;
    const text = normalizeText(open.lines.join("\n"));
    if (text) {
      const title = normalizeText(open.title);
      const entryKey = open.id ? `id-${open.id}` : fallbackKey(open.date, title);
      entries.push({ entryKey, date: open.date, title, text, url: open.id ? `${opts.baseUrl}#${open.id}` : opts.baseUrl });
    }
    open = null;
  };

  for (const b of blocks) {
    if (b.kind === "heading" && opts.entryLevels.includes(b.level)) {
      close();
      if (isDateHeading(b.text)) {
        currentDate = parseDate(b.text);
        dateLevel = b.level;
      } else if (b.level <= dateLevel) {
        // A new non-date section at or above the date level ends the date group.
        currentDate = parseDate(b.text);
        dateLevel = 0;
      }
      open = { title: b.text, date: parseDate(b.text) ?? currentDate, id: b.id, lines: [] };
    } else if (b.kind === "text" && open) {
      open.lines.push(b.text);
    } else if (b.kind === "heading" && open) {
      open.lines.push(b.text); // sub-heading below the entry level belongs to the entry text
    }
  }
  close();

  // Duplicate keys (same title + date twice) get a positional suffix so keys stay unique and stable.
  const seen = new Map<string, number>();
  return entries.map((e) => {
    const n = seen.get(e.entryKey) ?? 0;
    seen.set(e.entryKey, n + 1);
    return n === 0 ? e : { ...e, entryKey: `${e.entryKey}-${n + 1}` };
  });
}

export { slugify };
