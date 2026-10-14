import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { waitForLink } from "./outbox";

// /admin/indhold renders for a GREB_ADMIN whose session has passed 2FA, and is closed to everyone else.
// 2FA enrollment itself is covered in tests/integration/two-factor.test.ts; here it is set directly in the e2e DB.

async function sql(query: string, params: unknown[]) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(query, params);
  } finally {
    await client.end();
  }
}

test("GREB_ADMIN with verified 2FA sees the content engine review screen; a normal user does not", async ({ page }) => {
  const email = `admin-${randomUUID().slice(0, 8)}@example.test`;
  await page.goto("/opret");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send login-link" }).click();
  await expect(page.getByRole("heading", { name: "Tjek din mail" })).toBeVisible();
  await page.goto(await waitForLink(email, "magic-link"));
  await expect(page).toHaveURL(/\/hjem/);

  // Not yet an admin → no access.
  await page.goto("/admin/indhold");
  await expect(page).toHaveURL(/\/konto\?fejl=adgang/);

  await sql(`UPDATE "user" SET "platformRole" = 'GREB_ADMIN', "twoFactorEnabled" = true WHERE email = $1`, [email]);
  await sql(`UPDATE "session" SET "twoFactorVerifiedAt" = now() WHERE "userId" = (SELECT id FROM "user" WHERE email = $1)`, [email]);

  await page.goto("/admin/indhold");
  await expect(page.getByRole("heading", { name: "Indholdsmotor" })).toBeVisible();
  await expect(page.getByTestId("kill-switches")).toBeVisible();
  await expect(page.getByTestId("review-queue")).toBeVisible();
  await expect(page.getByTestId("content-sources")).toContainText("openai-chatgpt-rn");
  await expect(page.getByTestId("pipeline-runs")).toBeVisible();
});
