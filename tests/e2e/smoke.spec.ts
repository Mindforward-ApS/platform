import { expect, test } from "@playwright/test";

test("forsiden svarer 200 og viser Mindforward", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lær AI ved at gøre det.");
});

test("health svarer", async ({ request }) => {
  const r = await request.get("/api/health");
  expect([200, 503]).toContain(r.status());
  const body = await r.json();
  expect(body).toHaveProperty("status");
});
