import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { OUTBOX_DIR, waitForLink } from "./outbox";

// M6 with STRIPE_MOCK=1: the fake Stripe stands in for hosted Checkout and sends signed webhooks to
// /api/webhooks/stripe, so access comes only from the webhook-written Subscription.

const newEmail = (label: string) => `${label}-${randomUUID().slice(0, 8)}@example.test`;
const DATE_TIME = /\d{1,2}\. [a-zæøå]+ \d{4} kl\. \d{2}[.:]\d{2}/;

/** Signup = fill email, click "Send login-link", click the link in the mail: 2 clicks. */
const SIGNUP_CLICKS = 2;

async function signUp(page: Page, email: string) {
  await page.goto("/opret");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send login-link" }).click();
  await expect(page.getByRole("heading", { name: "Tjek din mail" })).toBeVisible();
  await page.goto(await waitForLink(email, "magic-link"));
  await expect(page).toHaveURL(/\/konto$/);
}

async function buy(page: Page) {
  await page.goto("/koeb");
  const buyButton = page.getByRole("button", { name: "Køb", exact: true });
  const boxes = page.getByRole("checkbox");
  // The form streams in (Suspense); allow for a busy, fully parallel run.
  await expect(buyButton).toBeVisible({ timeout: 20_000 });
  await expect(boxes).toHaveCount(2);
  for (const box of await boxes.all()) await expect(box).not.toBeChecked();
  await expect(buyButton).toBeDisabled();
  for (const box of await boxes.all()) await box.check();
  await expect(buyButton).toBeEnabled();
  await buyButton.click();
  // Fake stand-in for Stripe's hosted Checkout page (STRIPE_MOCK=1).
  await page.getByRole("button", { name: "Gennemfør testbetaling" }).click();
  await expect(page).toHaveURL(/\/konto\/abonnement\?tak=1/);
  await expect(page.getByText("Din betaling er bekræftet")).toBeVisible();
}

async function waitForMail(to: string, template: string, timeoutMs = 15_000): Promise<{ subject: string; text: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const f of await readdir(OUTBOX_DIR).catch(() => [])) {
      const mail = JSON.parse(await readFile(join(OUTBOX_DIR, f), "utf8")) as { to: string; template: string; subject: string; text: string };
      if (mail.to === to.toLowerCase() && mail.template === template) return mail;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No ${template} mail to ${to}`);
}

test("checkout page: button says exactly 'Køb', bold price incl. VAT right above it, declarations not pre-ticked", async ({ page }) => {
  await signUp(page, newEmail("koeb"));
  await page.goto("/koeb");
  const button = page.getByRole("button", { name: "Køb", exact: true });
  await expect(button).toHaveText("Køb");
  // The element immediately before the button is the bold price incl. VAT.
  const previous = button.locator("xpath=preceding-sibling::*[1]");
  await expect(previous).toHaveAttribute("data-testid", "checkout-price");
  await expect(previous.locator("strong")).toHaveText(/kr\. pr\. md\. inkl\. moms$/);
  await expect(page.getByTestId("pre-purchase-info")).toContainText("fornyes automatisk");
  await expect(page.getByTestId("pre-purchase-info")).toContainText("opsige når som helst");
  for (const box of await page.getByRole("checkbox").all()) await expect(box).not.toBeChecked();
});

test("B2C purchase → immediate access → 'Fortryd aftale' → 'Bekræft fortrydelse' → receipt with date/time on page and by mail", async ({ page }) => {
  const email = newEmail("fortryd");
  await signUp(page, email);
  await buy(page);
  await expect(page.getByTestId("subscription-status")).toHaveText("Aktivt");
  await expect(page.getByTestId("plan-name")).toContainText("Personlig");
  await expect(waitForMail(email, "order-confirmation")).resolves.toMatchObject({ subject: "Ordrebekræftelse: Mindforward" });

  await page.getByRole("link", { name: "Fortryd aftale" }).click();
  await expect(page).toHaveURL(/\/fortryd-aftale$/);
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByLabel("Navn").fill("E2E Kunde");
  await page.getByRole("button", { name: "Bekræft fortrydelse" }).click();

  await expect(page).toHaveURL(/\/fortryd-aftale\/kvittering/);
  const receipt = page.getByTestId("withdrawal-receipt");
  await expect(receipt).toContainText(DATE_TIME);
  await expect(receipt).toContainText(email);

  const mail = await waitForMail(email, "withdrawal-receipt");
  expect(mail.text).toMatch(DATE_TIME);
  expect(mail.text).toContain("dansk tid");

  await page.goto("/konto/abonnement");
  await expect(page.getByText("Du har fortrudt aftalen")).toBeVisible();
  await expect(page.getByRole("link", { name: "Fortryd aftale" })).toHaveCount(0);
});

test("cancellation in the app takes no more clicks than signup, keeps access to the period end, and can be resumed", async ({ page }) => {
  const email = newEmail("opsig");
  await signUp(page, email);
  await buy(page);

  let clicks = 0;
  await page.getByRole("link", { name: "Opsig abonnement" }).click();
  clicks++;
  await expect(page.getByText(/Dit abonnement stopper .+ Du har adgang indtil da\./)).toBeVisible();
  await page.getByRole("button", { name: "Bekræft opsigelse" }).click();
  clicks++;
  expect(clicks).toBeLessThanOrEqual(SIGNUP_CLICKS);

  await expect(page).toHaveURL(/\/konto\/abonnement\?opsagt=1/);
  await expect(page.getByText(/Dit abonnement er opsagt og stopper/)).toBeVisible();
  await expect(page.getByTestId("subscription-status")).toHaveText("Aktivt");
  await expect(waitForMail(email, "cancellation-confirmed")).resolves.toMatchObject({ subject: "Dit abonnement er opsagt" });

  await page.getByRole("button", { name: "Genoptag abonnement" }).click();
  await expect(page.getByText("Dit abonnement fortsætter.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Opsig abonnement" })).toBeVisible();
});

test("public 'Fortryd aftale' works without login and returns a receipt", async ({ page }) => {
  const email = newEmail("offentlig");
  await page.goto("/fortryd-aftale");
  await page.getByLabel("Navn").fill("Uden Login");
  await page.getByLabel("Hvilken aftale").fill("Mindforward Personlig, købt i går");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Bekræft fortrydelse" }).click();
  await expect(page.getByTestId("withdrawal-receipt")).toContainText(DATE_TIME);
  expect((await waitForMail(email, "withdrawal-receipt")).text).toMatch(DATE_TIME);
});

test("the Stripe webhook rejects an unsigned request", async ({ request }) => {
  const res = await request.post("/api/webhooks/stripe", { data: { id: "evt_fake", type: "customer.subscription.updated" }, headers: { "stripe-signature": "t=1,v1=bad" } });
  expect(res.status()).toBe(400);
});
