import type { FetchMode } from "@/generated/prisma/client";
import { httpRequest } from "@/server/http";

// Polite fetching (docs/06 § 2): honest User-Agent, robots.txt, conditional GET, 30 s timeout, 5 MB body cap,
// max 3 redirects on the same registrable domain, Cloudflare challenges are never bypassed.
// Retries with 1 → 5 → 30 min backoff are scheduled by the caller (Inngest step.sleep) using `retryDelayMs`.

export const MAX_BODY_BYTES = 5 * 1024 * 1024;
export const FETCH_TIMEOUT_MS = 30_000;
export const MAX_REDIRECTS = 3;
export const RETRY_SCHEDULE_MS = [60_000, 5 * 60_000, 30 * 60_000] as const;
const ROBOTS_TTL_MS = 24 * 60 * 60 * 1000;
export const BOT_NAME = "GrebContentBot";

export type FetchResult =
  | { kind: "OK"; status: number; body: Buffer; etag: string | null; lastModified: string | null; origin: "FETCH" | "BROWSER" }
  | { kind: "NOT_MODIFIED"; status: 304 }
  | { kind: "RETRY"; status?: number; retryAfterMs?: number; reason: string }
  | { kind: "FAILED"; status?: number; reason: string }
  | { kind: "ROBOTS_DISALLOWED"; reason: string }
  | { kind: "CHALLENGE"; status: number; reason: string };

export interface BrowserFetch {
  (url: string, userAgent: string): Promise<{ status: number; body: string } | null>;
}

export interface FetchDeps {
  userAgent: string;
  fetchImpl?: typeof fetch;
  /** Optional single headless fetch for BROWSER_FALLBACK sources (no stealth, same UA). Not wired in MVP. */
  browserFetch?: BrowserFetch;
  robotsCache?: RobotsCache;
  now?: () => number;
}

export interface FetchTarget {
  url: string;
  etag: string | null;
  lastModified: string | null;
  fetchMode: FetchMode;
}

/** Delay before retry n (0-based); Retry-After always wins when it is longer. */
export function retryDelayMs(attempt: number, retryAfterMs?: number): number {
  const base = RETRY_SCHEDULE_MS[Math.min(attempt, RETRY_SCHEDULE_MS.length - 1)]!;
  return Math.max(base, retryAfterMs ?? 0);
}

export function registrableDomain(host: string): string {
  return host.toLowerCase().split(".").slice(-2).join(".");
}

// ── robots.txt ────────────────────────────────────────────────────────────
interface RobotsRules {
  allow: string[];
  disallow: string[];
}
export type RobotsCache = Map<string, { fetchedAt: number; rules: RobotsRules }>;
const defaultRobotsCache: RobotsCache = new Map();

/** Rules for our bot: the group naming GrebContentBot if present, otherwise `*`. */
export function parseRobots(txt: string, bot = BOT_NAME): RobotsRules {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], allow: [], disallow: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" && value) current.allow.push(value);
    if (field === "disallow" && value) current.disallow.push(value);
  }
  const mine = groups.find((g) => g.agents.some((a) => a !== "*" && bot.toLowerCase().includes(a))) ?? groups.find((g) => g.agents.includes("*"));
  return { allow: mine?.allow ?? [], disallow: mine?.disallow ?? [] };
}

const ruleMatches = (rule: string, path: string) => {
  const re = new RegExp(`^${rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
  return re.test(path);
};

/** Longest matching rule wins; Allow wins ties (RFC 9309). */
export function robotsAllows(rules: RobotsRules, pathWithQuery: string): boolean {
  const best = (list: string[]) => Math.max(-1, ...list.filter((r) => ruleMatches(r, pathWithQuery)).map((r) => r.length));
  return best(rules.allow) >= best(rules.disallow);
}

async function robotsFor(url: URL, deps: FetchDeps): Promise<RobotsRules | "UNREACHABLE"> {
  const cache = deps.robotsCache ?? defaultRobotsCache;
  const now = deps.now?.() ?? Date.now();
  const hit = cache.get(url.origin);
  if (hit && now - hit.fetchedAt < ROBOTS_TTL_MS) return hit.rules;
  try {
    const res = await httpRequest(`${url.origin}/robots.txt`, {
      service: "content-robots",
      headers: { "User-Agent": deps.userAgent },
      timeoutMs: FETCH_TIMEOUT_MS,
      retries: 1,
      fetchImpl: deps.fetchImpl,
    });
    // RFC 9309: 4xx = no restrictions; 5xx = treat as fully disallowed for now (retry later).
    if (res.status >= 500) return "UNREACHABLE";
    const rules = res.ok ? parseRobots(await res.text()) : { allow: [], disallow: [] };
    cache.set(url.origin, { fetchedAt: now, rules });
    return rules;
  } catch {
    return "UNREACHABLE";
  }
}

// ── body + challenge detection ────────────────────────────────────────────
async function readCapped(res: Response): Promise<Buffer | "TOO_LARGE"> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    await res.body?.cancel().catch(() => {});
    return "TOO_LARGE";
  }
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return "TOO_LARGE";
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export function isCloudflareChallenge(status: number, headers: Headers, body: string): boolean {
  if (status !== 403 && status !== 503 && status !== 429) return false;
  return Boolean(headers.get("cf-mitigated")) || /challenge-platform|cf-chl|Just a moment\.\.\.|Attention Required! \| Cloudflare/i.test(body);
}

// ── fetch ─────────────────────────────────────────────────────────────────
export async function fetchSource(target: FetchTarget, deps: FetchDeps): Promise<FetchResult> {
  const baseFetch = deps.fetchImpl ?? fetch;
  const manualRedirects: typeof fetch = (input, init) => baseFetch(input, { ...init, redirect: "manual" });
  let url = new URL(target.url);
  const domain = registrableDomain(url.hostname);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const robots = await robotsFor(url, deps);
    if (robots === "UNREACHABLE") return { kind: "RETRY", reason: "robots.txt unreachable" };
    if (!robotsAllows(robots, url.pathname + url.search)) return { kind: "ROBOTS_DISALLOWED", reason: `robots.txt disallows ${url.pathname}` };

    const headers: Record<string, string> = {
      "User-Agent": deps.userAgent,
      Accept: "text/html, text/markdown, application/json, application/atom+xml;q=0.9, */*;q=0.5",
    };
    if (hop === 0 && target.etag) headers["If-None-Match"] = target.etag;
    if (hop === 0 && target.lastModified) headers["If-Modified-Since"] = target.lastModified;

    let res: Response;
    try {
      res = await httpRequest(url.toString(), { service: "content-source", headers, timeoutMs: FETCH_TIMEOUT_MS, retries: 0, fetchImpl: manualRedirects });
    } catch (err) {
      return { kind: "RETRY", reason: err instanceof Error ? err.name : "network error" };
    }

    if (res.status >= 300 && res.status < 400 && res.status !== 304) {
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => {});
      if (!location) return { kind: "FAILED", status: res.status, reason: "redirect without Location" };
      const next = new URL(location, url);
      if (next.protocol !== "https:" || registrableDomain(next.hostname) !== domain) return { kind: "FAILED", status: res.status, reason: `redirect to another domain (${next.hostname})` };
      url = next;
      continue;
    }
    if (res.status === 304) return { kind: "NOT_MODIFIED", status: 304 };

    const body = await readCapped(res);
    if (body === "TOO_LARGE") return { kind: "FAILED", status: res.status, reason: "body larger than 5 MB" };

    if (res.ok) {
      return { kind: "OK", status: res.status, body, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified"), origin: "FETCH" };
    }
    if (isCloudflareChallenge(res.status, res.headers, body.toString("utf8"))) {
      if (target.fetchMode === "BROWSER_FALLBACK" && deps.browserFetch) {
        const page = await deps.browserFetch(url.toString(), deps.userAgent).catch(() => null);
        if (page && page.status >= 200 && page.status < 300 && !isCloudflareChallenge(403, new Headers(), page.body)) {
          return { kind: "OK", status: page.status, body: Buffer.from(page.body, "utf8"), etag: null, lastModified: null, origin: "BROWSER" };
        }
      }
      return { kind: "CHALLENGE", status: res.status, reason: "access challenge (Cloudflare) — not bypassed" };
    }
    const retryAfter = res.headers.get("retry-after");
    const retryAfterMs = retryAfter ? (/^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now()) || undefined) : undefined;
    if (res.status === 429 || res.status >= 500) return { kind: "RETRY", status: res.status, retryAfterMs, reason: `HTTP ${res.status}` };
    return { kind: "FAILED", status: res.status, reason: `HTTP ${res.status}` };
  }
  return { kind: "FAILED", reason: `more than ${MAX_REDIRECTS} redirects` };
}
