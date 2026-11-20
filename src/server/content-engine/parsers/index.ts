import type { ParserType } from "@/generated/prisma/client";
import { parsedEntrySchema, type ParsedEntry } from "../normalize";
import type { ParserConfig } from "../sources";
import { parseAtom } from "./atom";
import { parseHtml } from "./html";
import { parseJson } from "./json";
import { parseMarkdown } from "./markdown";

const PARSERS: Record<ParserType, (raw: string, config: ParserConfig, baseUrl: string) => ParsedEntry[]> = {
  HTML: parseHtml,
  MARKDOWN: parseMarkdown,
  JSON: parseJson,
  ATOM: parseAtom,
};

/** Parse a raw source document into entries. 0 entries is reported by the caller as an alarm, never silently. */
export function parseSource(type: ParserType, raw: string, config: ParserConfig, baseUrl: string): ParsedEntry[] {
  return PARSERS[type](raw, config, baseUrl).map((e) => parsedEntrySchema.parse(e));
}
