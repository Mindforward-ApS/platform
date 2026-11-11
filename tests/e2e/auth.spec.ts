import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { enterCode, loginWithCode } from "./login";
import { waitForCode as waitForCodeOf, waitForLink } from "./outbox";

const newEmail = (label: string) => `${label}-${randomUUID().slice(0, 8)}@example.test`;

async function signInWithCode(page: Page, email: string) {
  await loginWithCode(page, email);
}

test("login with an email code for a new address creates a PERSONAL org with the OWNER role", async ({ page }) => {
  await signInWithCode(page, newEmail("b2c"));
  await expect(page).toHaveURL(/\/hjem$/);
  await page.goto("/konto");
  await expect(page.getByTestId("active-org")).toContainText("Personlig");
  await expect(page.getByTestId("active-role")).toHaveText("Ejer");
});

test("OWNER creates a business, invites an employee, who accepts and lands as LEARNER", async ({ page, browser }) => {
  await signInWithCode(page, newEmail("owner"));
  await page.goto("/virksomhed/opret");
  await page.getByLabel("Virksomhedens navn").fill("E2E Firma ApS");
  await page.getByRole("button", { name: "Opret" }).click();
  await expect(page).toHaveURL(/\/virksomhed\/medarbejdere/);

  // M7: the OWNER accepts the data processing agreement before the first invitation.
  await page.goto("/virksomhed/databehandleraftale");
  await page.getByLabel("Dit fulde navn").fill("Olivia Ejer");
  await page.getByLabel("Din titel").fill("Direktør");
  await page.getByLabel("CVR-nummer").fill("12345678");
  await page.getByLabel("Jeg accepterer databehandleraftalen på vegne af virksomheden").check();
  await page.getByRole("button", { name: "Accepter aftalen" }).click();
  await expect(page.getByTestId("dpa-accepted")).toBeVisible();
  await page.goto("/virksomhed/medarbejdere");

  const learnerEmail = newEmail("learner");
  await page.getByLabel(/^Emails/).fill(learnerEmail);
  await page.getByRole("button", { name: "Send invitationer" }).click();
  await expect(page.getByTestId("pending-invitations")).toContainText(learnerEmail);

  const invitationUrl = await waitForLink(learnerEmail, "invitation");
  const learnerContext = await browser.newContext();
  const learner = await learnerContext.newPage();
  await learner.goto(invitationUrl);
  await expect(learner.getByText("E2E Firma ApS")).toBeVisible();
  await learner.getByRole("link", { name: "Log ind for at acceptere" }).click();
  await learner.getByLabel("Email").fill(learnerEmail);
  await learner.getByRole("button", { name: "Send kode" }).click();
  await enterCode(learner, learnerEmail);

  await expect(learner).toHaveURL(/\/invitation\//);
  await learner.getByRole("button", { name: "Accepter invitation" }).click();
  // M7: first login in a business shows what the admin can and cannot see (docs/10 § 1.6).
  await expect(learner).toHaveURL(/\/konto\/data-info$/);
  await learner.getByRole("button", { name: "Forstået — fortsæt" }).click();
  // Then the short employee onboarding: no company or membership steps.
  await expect(learner).toHaveURL(/\/kom-i-gang\?trin=velkommen$/);
  await learner.goto("/konto");
  await expect(learner.getByTestId("active-org")).toContainText("E2E Firma ApS");
  await expect(learner.getByTestId("active-role")).toHaveText("Medarbejder");

  await page.reload();
  await expect(page.getByTestId("members")).toContainText(learnerEmail);
  await learnerContext.close();
});

test("a PERSONAL (B2C) account cannot open the members page", async ({ page }) => {
  await signInWithCode(page, newEmail("solo"));
  await page.goto("/virksomhed/medarbejdere");
  await expect(page).toHaveURL(/\/konto\?fejl=adgang/);
});

test("an expired or unknown invitation shows a clear message", async ({ page }) => {
  await page.goto("/invitation/does-not-exist");
  await expect(page.getByRole("alert").filter({ hasText: "udløbet" })).toBeVisible();
});

test("a wrong code is refused with a message and nothing is signed in", async ({ page }) => {
  const email = newEmail("wrong");
  await page.goto("/log-ind");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send kode" }).click();
  await expect(page.getByRole("heading", { name: "Tjek din mail" })).toBeVisible();
  const code = await waitForCodeOf(email);
  await page.getByLabel("Ciffer 1").fill(code === "000000" ? "111111" : "000000");
  await expect(page.getByText("Koden passer ikke")).toBeVisible();
  await page.goto("/hjem");
  await expect(page).toHaveURL(/\/log-ind/);
});
