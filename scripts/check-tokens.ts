import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// Design is not decided: colors and fonts may only be defined in src/styles/tokens.css (CLAUDE.md "Designregel").

export interface DesignViolation {
  file: string;
  line: number;
  kind: "color" | "font";
  match: string;
}

const ALLOWED_FILES = new Set(["src/styles/tokens.css"]);
const SCANNED_EXT = /\.(tsx?|jsx?|css|mdx?)$/;

const TAILWIND_PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";

const RULES: { kind: DesignViolation["kind"]; re: RegExp }[] = [
  // hex colors: #abc, #abcd, #aabbcc, #aabbccdd
  { kind: "color", re: /(?<![\w&])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g },
  { kind: "color", re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/g },
  { kind: "color", re: new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide)-(?:${TAILWIND_PALETTE})(?:-\\d{2,3})?\\b`, "g") },
  { kind: "font", re: /font-family\s*:/g },
  { kind: "font", re: /\bfontFamily\s*:/g },
  { kind: "font", re: /next\/font\//g },
];

export function findDesignViolations(file: string, source: string): DesignViolation[] {
  const normalized = file.split(sep).join("/");
  if (ALLOWED_FILES.has(normalized)) return [];
  const found: (DesignViolation & { index: number })[] = [];
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (index: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((lineStarts[mid] ?? 0) <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  for (const rule of RULES) {
    for (const m of source.matchAll(rule.re)) {
      const index = m.index ?? 0;
      found.push({ file: normalized, line: lineOf(index), kind: rule.kind, match: m[0], index });
    }
  }
  return found.sort((a, b) => a.index - b.index).map(({ index: _index, ...v }) => v);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "generated" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCANNED_EXT.test(entry)) out.push(full);
  }
  return out;
}

function main() {
  const root = process.cwd();
  const files = walk(join(root, "src"));
  const violations = files.flatMap((f) => findDesignViolations(relative(root, f), readFileSync(f, "utf8")));
  if (violations.length === 0) {
    console.log(`check-tokens: OK (${files.length} filer)`);
    return;
  }
  for (const v of violations) console.error(`${v.file}:${v.line}  ${v.kind}  ${v.match}`);
  console.error(`\ncheck-tokens: ${violations.length} farver/fonte uden for src/styles/tokens.css`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
