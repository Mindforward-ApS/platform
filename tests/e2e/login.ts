import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { waitForCode } from "./outbox";

// Sign-in with the 6-digit email code (replaced the magic link 11 Nov 2026). A new address is created on the first
// correct code and lands on /hjem via /start; the full sign-up onboarding is covered in onboarding.spec.ts.

/** Types the code from the mail into the first box (the form spreads it over the six boxes and submits itself). */
export async function enterCode(page: Page, email: string) {
  const from = page.url();
  await page.getByLabel("Ciffer 1").fill(await waitForCode(email));
  // Wait for the sign-in to finish (the form submits itself and redirects).
  await page.waitForURL((url) => url.toString() !== from, { timeout: 15_000 });
}

export async function loginWithCode(page: Page, email: string, from = "/log-ind") {
  // Codes are rate-limited per IP; give each sign-in its own client IP so a full parallel run does not hit it
  // (on Vercel this header is set by the platform).
  await page.setExtraHTTPHeaders({ "x-vercel-forwarded-for": `2001:db8::${randomUUID().slice(0, 4)}:${randomUUID().slice(0, 4)}` });
  await page.goto(from);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send kode" }).click();
  await expect(page.getByRole("heading", { name: "Tjek din mail" })).toBeVisible();
  await enterCode(page, email);
}
