import type { ParsedEntry } from "../normalize";
import type { ParserConfig } from "../sources";
import { blocksToEntries, slugify, type Block } from "./sections";

// Markdown release notes (Microsoft Learn via ?accept=text/markdown). Front matter, HTML comments, images and
// link targets are dropped; link text is kept. Learn derives heading anchors from the heading text.

function inline(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])[*_](\S[^*_]*?)[*_](?=[^\w*]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1");
}

export function markdownToBlocks(raw: string): Block[] {
  const body = raw
    .replace(/^﻿?---\n[\s\S]*?\n---\n/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\r\n/g, "\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let inFence = false;
  const flush = () => {
    const text = para.join("\n").trim();
    if (text) blocks.push({ kind: "text", text });
    para = [];
  };
  for (const line of body.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      para.push(line);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*?)\s*(?:\{#([\w-]+)\})?\s*#*\s*$/);
    if (h) {
      flush();
      const text = inline(h[2]!).trim();
      blocks.push({ kind: "heading", level: h[1]!.length, text, id: h[3] ?? (slugify(text) || undefined) });
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    const item = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
    if (item) {
      flush();
      blocks.push({ kind: "text", text: `- ${inline(item[1]!)}` });
      continue;
    }
    if (/^\s*>/.test(line)) {
      para.push(inline(line.replace(/^\s*>\s?(\[!\w+\]\s*)?/, "")));
      continue;
    }
    if (/^\s*\|?\s*:?-{3,}/.test(line)) continue; // table separator
    para.push(inline(line.replace(/\|/g, " ")));
  }
  flush();
  return blocks;
}

export function parseMarkdown(raw: string, config: ParserConfig, baseUrl: string): ParsedEntry[] {
  const levels = (config.entryHeadings ?? [2, 3]).map((h) => (typeof h === "number" ? h : Number(h.slice(1))));
  // Deep links point at the human page, not the ?accept=text/markdown variant.
  const url = new URL(baseUrl);
  url.searchParams.delete("accept");
  url.hash = "";
  return blocksToEntries(markdownToBlocks(raw), { entryLevels: levels, baseUrl: url.toString() });
}
