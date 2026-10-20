import { expect, test } from "@playwright/test";

test("forsiden sender videre til mindforward.dk", async ({ page }) => {
  // "/" no longer has its own landing page: signed-out visitors are sent to the website (mindforward.dk).
  const response = await page.request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/^https:\/\/mindforward\.dk\/?$/);
});

test("health svarer", async ({ request }) => {
  const r = await request.get("/api/health");
  expect([200, 503]).toContain(r.status());
  const body = await r.json();
  expect(body).toHaveProperty("status");
});
