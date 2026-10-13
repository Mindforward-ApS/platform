import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { describePrice, getPlan, isPaidPlanKey } from "@/server/billing/plans";

// Help center (docs/08 § 5): Markdown in content/help/{slug}.md with frontmatter, loaded once per process and
// searched with a small in-memory full-text index (MVP; docs/08 names Postgres FTS — there is no HelpArticle table,
// see docs/OPEN-QUESTIONS.md). Articles never contain prices as text: `{{price:PLAN_KEY}}` renders from config.

export const HELP_DIR = join(process.cwd(), "content", "help");

const AUDIENCES = ["B2C", "B2B_ADMIN", "LEARNER"] as const;

export const frontmatterSchema = z.strictObject({
  title: z.string().min(3).max(120),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  audience: z.array(z.enum(AUDIENCES)).min(1),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  related: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});

export interface HelpArticle extends z.infer<typeof frontmatterSchema> {
  /** Markdown body with price tokens rendered. */
  body: string;
}

export interface HelpSearchHit {
  slug: string;
  title: string;
  excerpt: string;
  score: number;
}

function parseList(value: string): string[] {
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  return inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

/** Minimal frontmatter parser: `key: value` and `key: [a, b]` lines between `---` fences (no YAML dependency). */
export function parseArticle(source: string, file = "article"): HelpArticle {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source.replace(/\r\n/g, "\n"));
  if (!m) throw new Error(`${file}: missing frontmatter`);
  const raw: Record<string, unknown> = {};
  for (const line of (m[1] ?? "").split("\n")) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx < 0) throw new Error(`${file}: invalid frontmatter line "${line}"`);
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    raw[key] = value.startsWith("[") ? parseList(value) : value.replace(/^"(.*)"$/, "$1");
  }
  const fm = frontmatterSchema.safeParse(raw);
  if (!fm.success) throw new Error(`${file}: ${fm.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return { ...fm.data, body: renderPriceTokens((m[2] ?? "").trim(), file) };
}

export function renderPriceTokens(body: string, file = "article"): string {
  return body.replace(/\{\{price:([A-Z0-9_]+)\}\}/g, (_all, key: string) => {
    if (!isPaidPlanKey(key)) throw new Error(`${file}: unknown price token ${key}`);
    return describePrice(getPlan(key)).headline;
  });
}

const STOP = new Set(["og", "i", "at", "en", "et", "den", "det", "de", "er", "på", "til", "med", "for", "af", "jeg", "du", "kan", "min", "mit", "mine", "hvordan", "hvad", "hvor", "har", "ikke", "som", "om", "the", "a", "to", "how", "i", "my", "do", "is", "jeg", "vil", "gerne", "mig", "der"]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Light Danish stemming so "opsige"/"opsigelse"/"opsiger" meet (prefix match on ≥ 5 chars). */
function matches(queryToken: string, docToken: string): boolean {
  if (queryToken === docToken) return true;
  const n = Math.min(queryToken.length, docToken.length);
  if (n < 5) return false;
  const stem = Math.max(5, n - 3);
  return queryToken.slice(0, stem) === docToken.slice(0, stem);
}

interface IndexedArticle {
  article: HelpArticle;
  title: string[];
  keywords: string[];
  body: string[];
}

export class HelpIndex {
  private readonly entries: IndexedArticle[];
  private readonly bySlug: Map<string, HelpArticle>;

  constructor(articles: HelpArticle[]) {
    this.entries = articles.map((article) => ({
      article,
      title: tokenize(article.title),
      keywords: article.keywords.flatMap(tokenize),
      body: tokenize(article.body),
    }));
    this.bySlug = new Map(articles.map((a) => [a.slug, a]));
  }

  all(): HelpArticle[] {
    return [...this.bySlug.values()].sort((a, b) => a.title.localeCompare(b.title, "da"));
  }

  get(slug: string): HelpArticle | undefined {
    return this.bySlug.get(slug);
  }

  /** Top hits: title match weighs 5, keyword 4, body 1 (per distinct query token); ties by title. */
  search(query: string, limit = 5): HelpSearchHit[] {
    const q = [...new Set(tokenize(query.slice(0, 200)))];
    if (q.length === 0) return [];
    const scored = this.entries.map((e) => {
      let score = 0;
      for (const t of q) {
        if (e.title.some((d) => matches(t, d))) score += 5;
        if (e.keywords.some((d) => matches(t, d))) score += 4;
        if (e.body.some((d) => matches(t, d))) score += 1;
      }
      return { e, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.e.article.title.localeCompare(b.e.article.title, "da"))
      .slice(0, limit)
      .map(({ e, score }) => ({ slug: e.article.slug, title: e.article.title, excerpt: excerpt(e.article.body), score }));
  }
}

export function excerpt(body: string, max = 180): string {
  const plain = body.replace(/\*\*/g, "").replace(/^\s*(?:\d+\.|[-*])\s+/gm, "").replace(/\s+/g, " ").trim();
  return plain.length <= max ? plain : `${plain.slice(0, max - 1).replace(/\s+\S*$/, "")} …`;
}

export function loadArticles(dir = HELP_DIR): HelpArticle[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  const articles = files.map((f) => {
    const a = parseArticle(readFileSync(join(dir, f), "utf8"), f);
    if (`${a.slug}.md` !== f) throw new Error(`${f}: slug "${a.slug}" must match the file name`);
    return a;
  });
  const slugs = new Set(articles.map((a) => a.slug));
  for (const a of articles) for (const r of a.related) if (!slugs.has(r)) throw new Error(`${a.slug}.md: related article "${r}" does not exist`);
  return articles;
}

let index: HelpIndex | undefined;

export function helpIndex(): HelpIndex {
  index ??= new HelpIndex(loadArticles());
  return index;
}

export function helpArticleUrl(slug: string): string {
  return `/hjaelp/${slug}`;
}
