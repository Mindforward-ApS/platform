import { expect, test, type Page } from "@playwright/test";

// M10 (docs/10 § 3, docs/02 § 8): PostHog sets NO analytics cookies and stores nothing in localStorage /
// sessionStorage before consent; only after "Accepter statistik" does it persist. Ingestion requests are
// intercepted (no network). The e2e build must set NEXT_PUBLIC_POSTHOG_KEY (+ a same-origin
// NEXT_PUBLIC_POSTHOG_HOST so no third-party host is contacted); without a key PostHog is never loaded.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// PostHog drops events from headless browsers (bot filter); a normal desktop UA makes the capture observable.
test.use({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" });

async function storage(page: Page) {
  return page.evaluate(() => {
    const keys = (s: Storage) => Array.from({ length: s.length }, (_, i) => s.key(i) ?? "");
    return { local: keys(localStorage), session: keys(sessionStorage) };
  });
}

const isPostHogKey = (k: string) => /^ph_|posthog|__ph/i.test(k);

test("PostHog stores nothing before analytics consent and persists only after it", async ({ page, context }) => {
  test.skip(!KEY, "NEXT_PUBLIC_POSTHOG_KEY not set for this build");
  // PostHog also treats navigator.webdriver / the HeadlessChrome brand (set by Playwright) as a bot and drops events.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  const captured: string[] = [];
  // Any PostHog host (same-origin /ingest in the e2e build, or the real EU host) is answered locally.
  await page.route(/\/ingest\/|posthog\.com/, async (route) => {
    captured.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"status":1}' });
  });

  await page.goto("/niveautest");
  await expect(page.getByTestId("cookie-banner")).toBeVisible();
  // PostHog loaded and sent an (anonymous, cookieless) page view.
  await expect.poll(() => captured.length, { timeout: 15_000 }).toBeGreaterThan(0);
  await page.goto("/hjaelp");
  await page.waitForTimeout(500);

  const cookiesBefore = (await context.cookies()).map((c) => c.name);
  expect(cookiesBefore.filter(isPostHogKey)).toEqual([]);
  const before = await storage(page);
  expect(before.local.filter(isPostHogKey)).toEqual([]);
  expect(before.session.filter(isPostHogKey)).toEqual([]);

  await page.getByRole("button", { name: "Kun nødvendige" }).click();
  await page.waitForTimeout(300);
  expect((await context.cookies()).map((c) => c.name).filter(isPostHogKey)).toEqual([]);
  expect((await storage(page)).local.filter(isPostHogKey)).toEqual([]);

  // Consent → PostHog may now persist (cookie and/or localStorage).
  await page.getByRole("button", { name: "Cookieindstillinger" }).click();
  await page.getByRole("button", { name: "Accepter statistik" }).click();
  await expect
    .poll(async () => [...(await context.cookies()).map((c) => c.name), ...(await storage(page)).local].filter(isPostHogKey).length, { timeout: 10_000 })
    .toBeGreaterThan(0);
});
