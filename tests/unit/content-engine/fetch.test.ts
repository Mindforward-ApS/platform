import { describe, expect, it, vi } from "vitest";
import { fetchSource, parseRobots, retryDelayMs, robotsAllows, type FetchDeps, type RobotsCache } from "@/server/content-engine/fetch";

const UA = "GrebContentBot/1.0 (+https://mindforward.dk/bot; kontakt@mindforward.dk)";
const target = { url: "https://help.example.com/en/articles/1-release-notes", etag: null, lastModified: null, fetchMode: "DIRECT" as const };

type Handler = (url: string, init: RequestInit) => Response;
function deps(handler: Handler, extra: Partial<FetchDeps> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nDisallow: /private\n", { status: 200 });
    return handler(url, init ?? {});
  }) as unknown as typeof fetch;
  return { d: { userAgent: UA, fetchImpl, robotsCache: new Map() as RobotsCache, ...extra }, calls };
}
const header = (init: RequestInit, name: string) => new Headers(init.headers).get(name);

describe("fetchSource", () => {
  it("sends the honest User-Agent and returns the body with ETag/Last-Modified", async () => {
    const { d, calls } = deps(() => new Response("<html>ok</html>", { status: 200, headers: { etag: '"v1"', "last-modified": "Mon, 12 Oct 2026 08:00:00 GMT" } }));
    const r = await fetchSource(target, d);
    expect(r).toMatchObject({ kind: "OK", status: 200, etag: '"v1"', lastModified: "Mon, 12 Oct 2026 08:00:00 GMT", origin: "FETCH" });
    const page = calls.find((c) => !c.url.endsWith("robots.txt"))!;
    expect(header(page.init, "user-agent")).toBe(UA);
  });

  it("sends If-None-Match / If-Modified-Since and maps 304 to NOT_MODIFIED", async () => {
    const { d, calls } = deps(() => new Response(null, { status: 304 }));
    const r = await fetchSource({ ...target, etag: '"v1"', lastModified: "Mon, 12 Oct 2026 08:00:00 GMT" }, d);
    expect(r.kind).toBe("NOT_MODIFIED");
    const page = calls.find((c) => !c.url.endsWith("robots.txt"))!;
    expect(header(page.init, "if-none-match")).toBe('"v1"');
    expect(header(page.init, "if-modified-since")).toBe("Mon, 12 Oct 2026 08:00:00 GMT");
  });

  it("asks for a retry on 5xx/429 (respecting Retry-After) but not on other 4xx", async () => {
    expect(await fetchSource(target, deps(() => new Response("x", { status: 503 })).d)).toMatchObject({ kind: "RETRY", status: 503 });
    expect(await fetchSource(target, deps(() => new Response("x", { status: 429, headers: { "retry-after": "120" } })).d)).toMatchObject({ kind: "RETRY", retryAfterMs: 120_000 });
    expect(await fetchSource(target, deps(() => new Response("x", { status: 404 })).d)).toMatchObject({ kind: "FAILED", status: 404 });
    expect(await fetchSource(target, deps(() => { throw new TypeError("fetch failed"); }).d)).toMatchObject({ kind: "RETRY" });
  });

  it("backs off 1 → 5 → 30 minutes and lets a longer Retry-After win", () => {
    expect([0, 1, 2].map((n) => retryDelayMs(n))).toEqual([60_000, 300_000, 1_800_000]);
    expect(retryDelayMs(0, 600_000)).toBe(600_000);
  });

  it("recognises a Cloudflare challenge and never bypasses it", async () => {
    const challenge = () => new Response("<title>Just a moment...</title>", { status: 403, headers: { "cf-mitigated": "challenge" } });
    expect(await fetchSource(target, deps(challenge).d)).toMatchObject({ kind: "CHALLENGE", status: 403 });
    // BROWSER_FALLBACK: one honest headless fetch, if provided.
    const browserFetch = vi.fn(async () => ({ status: 200, body: "<html>real</html>" }));
    const r = await fetchSource({ ...target, fetchMode: "BROWSER_FALLBACK" }, deps(challenge, { browserFetch }).d);
    expect(r).toMatchObject({ kind: "OK", origin: "BROWSER" });
    expect(browserFetch).toHaveBeenCalledWith(target.url, UA);
  });

  it("follows at most 3 redirects and only within the same registrable domain", async () => {
    let n = 0;
    const same = deps((url) => (url.includes("final") ? new Response("ok") : new Response(null, { status: 301, headers: { location: `https://www.example.com/final?n=${++n}` } })));
    expect((await fetchSource(target, same.d)).kind).toBe("OK");
    const other = deps(() => new Response(null, { status: 302, headers: { location: "https://evil.test/x" } }));
    expect(await fetchSource(target, other.d)).toMatchObject({ kind: "FAILED" });
    const loop = deps(() => new Response(null, { status: 302, headers: { location: "https://help.example.com/loop" } }));
    expect(await fetchSource(target, loop.d)).toMatchObject({ kind: "FAILED", reason: "more than 3 redirects" });
  });

  it("refuses bodies over 5 MB", async () => {
    const big = deps(() => new Response("x", { status: 200, headers: { "content-length": String(6 * 1024 * 1024) } }));
    expect(await fetchSource(target, big.d)).toMatchObject({ kind: "FAILED", reason: "body larger than 5 MB" });
  });

  it("respects robots.txt", async () => {
    const { d } = deps(() => new Response("ok"));
    expect(await fetchSource({ ...target, url: "https://help.example.com/private/notes" }, d)).toMatchObject({ kind: "ROBOTS_DISALLOWED" });
  });
});

describe("robots.txt", () => {
  it("uses our own group over *, longest match wins, Allow wins ties", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /\n\nUser-agent: GrebContentBot\nDisallow: /admin\nAllow: /admin/public\n");
    expect(robotsAllows(rules, "/en/articles/1")).toBe(true);
    expect(robotsAllows(rules, "/admin/x")).toBe(false);
    expect(robotsAllows(rules, "/admin/public/x")).toBe(true);
    expect(robotsAllows(parseRobots("User-agent: *\nDisallow: /\n"), "/x")).toBe(false);
    expect(robotsAllows(parseRobots(""), "/x")).toBe(true);
  });
});
