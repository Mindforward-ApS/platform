import { parse } from "node-html-parser";
import { normalizeText, type ParsedEntry } from "../normalize";
import type { ParserConfig } from "../sources";
import { htmlFragmentToText } from "./html";

// Atom feeds (Google Workspace Updates, phase 2). <id> is the stable entry key.

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

export function parseAtom(raw: string, _config: ParserConfig, baseUrl: string): ParsedEntry[] {
  const doc = parse(raw, { comment: false, blockTextElements: { content: true, summary: true, title: true } });
  return doc.querySelectorAll("entry").flatMap((e) => {
    const id = e.querySelector("id")?.text.trim();
    if (!id) return [];
    const body = e.querySelector("content") ?? e.querySelector("summary");
    const link = e.querySelectorAll("link").find((l) => (l.getAttribute("rel") ?? "alternate") === "alternate")?.getAttribute("href");
    const updated = (e.querySelector("updated") ?? e.querySelector("published"))?.text.trim().slice(0, 10) ?? null;
    const text = normalizeText(htmlFragmentToText(decode(body?.innerHTML ?? "")));
    if (!text) return [];
    return [{ entryKey: `atom-${id.replace(/[^\w.:-]/g, "").slice(-120)}`, date: updated, title: normalizeText(decode(e.querySelector("title")?.innerHTML ?? "")), text, url: link ?? baseUrl }];
  });
}
