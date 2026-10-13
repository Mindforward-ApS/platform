import { HTMLElement, NodeType, parse, type Node } from "node-html-parser";
import type { ParsedEntry } from "../normalize";
import type { ParserConfig } from "../sources";
import { blocksToEntries, type Block } from "./sections";

// HTML release notes (Intercom help-center articles, gemini.google). Navigation, scripts, cookie banners etc. are
// removed before text extraction (docs/06 § 3).

const DROP = "script, style, noscript, template, svg, nav, footer, header, form, button, iframe, [aria-hidden=true], [role=navigation], [id*=cookie], [class*=cookie], [class*=consent]";
const TEXT_BLOCKS = new Set(["P", "LI", "PRE", "BLOCKQUOTE", "TD", "TH", "DT", "DD", "FIGCAPTION", "CAPTION"]);
const HEADING = /^H([1-6])$/;

/** Text of an element with <br> and nested block elements as line breaks. */
function blockText(el: HTMLElement): string {
  const parts: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === NodeType.TEXT_NODE) parts.push(n.text);
    else if (n instanceof HTMLElement) {
      const t = n.tagName ?? "";
      if (t === "BR") parts.push("\n");
      const isBlock = TEXT_BLOCKS.has(t) || t === "UL" || t === "OL" || t === "DIV";
      if (isBlock && parts.length > 0) parts.push("\n");
      if (t === "LI" && n !== el) parts.push("- ");
      n.childNodes.forEach(walk);
    }
  };
  walk(el);
  return parts.join("").replace(/[ \t]*\n[ \t]*/g, "\n");
}

export function htmlToBlocks(root: HTMLElement): Block[] {
  const blocks: Block[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === NodeType.TEXT_NODE) {
      const text = n.text.trim();
      if (text) blocks.push({ kind: "text", text });
      return;
    }
    if (!(n instanceof HTMLElement)) return;
    const tag = n.tagName ?? "";
    const h = tag.match(HEADING);
    if (h) {
      const id = n.getAttribute("id") || n.querySelector("[id]")?.getAttribute("id") || n.querySelector("a[name]")?.getAttribute("name");
      blocks.push({ kind: "heading", level: Number(h[1]), text: n.text.replace(/\s+/g, " ").trim(), id: id || undefined });
      return;
    }
    if (TEXT_BLOCKS.has(tag)) {
      const text = blockText(n).trim();
      if (text) blocks.push({ kind: "text", text: tag === "LI" ? `- ${text}` : text });
      return;
    }
    n.childNodes.forEach(walk);
  };
  walk(root);
  return blocks;
}

export function parseHtml(raw: string, config: ParserConfig, baseUrl: string): ParsedEntry[] {
  const doc = parse(raw, { comment: false, blockTextElements: { script: false, style: false, noscript: false, pre: true } });
  const root = (config.contentSelector ? doc.querySelector(config.contentSelector) : null) ?? doc.querySelector("main") ?? doc.querySelector("body") ?? doc;
  for (const el of root.querySelectorAll(DROP)) el.remove();
  const levels = (config.entryHeadings ?? ["h2", "h3"]).map((h) => (typeof h === "number" ? h : Number(h.slice(1))));
  return blocksToEntries(htmlToBlocks(root), { entryLevels: levels, baseUrl: baseUrl.split("#")[0]! });
}

/** Plain text of an HTML fragment (JSON descriptions, Atom content). */
export function htmlFragmentToText(fragment: string): string {
  const doc = parse(`<div>${fragment}</div>`, { comment: false });
  return htmlToBlocks(doc)
    .map((b) => b.text)
    .join("\n");
}
