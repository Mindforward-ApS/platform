import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { waitForLink } from "./outbox";

const newEmail = (label: string) => `${label}-${randomUUID().slice(0, 8)}@example.test`;

async function signInWithMagicLink(page: Page, email: string, from: "/opret" | "/log-ind" = "/opret") {
  await page.goto(from);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send login-link" }).click();
  await expect(page.getByRole("heading", { name: "Tjek din mail" })).toBeVisible();
  await page.goto(await waitForLink(email, "magic-link"));
}

test("B2C signup with magic link creates a PERSONAL org with the OWNER role", async ({ page }) => {
  await signInWithMagicLink(page, newEmail("b2c"));
  await expect(page).toHaveURL(/\/konto$/);
  await expect(page.getByTestId("active-org")).toContainText("Personlig");
  await expect(page.getByTestId("active-role")).toHaveText("Ejer");
});

test("OWNER creates a business, invites an employee, who accepts and lands as LEARNER", async ({ page, browser }) => {
  await signInWithMagicLink(page, newEmail("owner"));
  await page.goto("/virksomhed/opret");
  await page.getByLabel("Virksomhedens navn").fill("E2E Firma ApS");
  await page.getByRole("button", { name: "Opret" }).click();
  await expect(page).toHaveURL(/\/virksomhed\/medarbejdere/);

  const learnerEmail = newEmail("learner");
  await page.getByRole("textbox", { name: "Email" }).fill(learnerEmail);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByTestId("pending-invitations")).toContainText(learnerEmail);

  const invitationUrl = await waitForLink(learnerEmail, "invitation");
  const learnerContext = await browser.newContext();
  const learner = await learnerContext.newPage();
  await learner.goto(invitationUrl);
  await expect(learner.getByText("E2E Firma ApS")).toBeVisible();
  await learner.getByRole("link", { name: "Log ind for at acceptere" }).click();
  await learner.getByLabel("Email").fill(learnerEmail);
  await learner.getByRole("button", { name: "Send login-link" }).click();
  await learner.goto(await waitForLink(learnerEmail, "magic-link"));

  await expect(learner).toHaveURL(/\/invitation\//);
  await learner.getByRole("button", { name: "Accepter invitation" }).click();
  await expect(learner).toHaveURL(/\/konto$/);
  await expect(learner.getByTestId("active-org")).toContainText("E2E Firma ApS");
  await expect(learner.getByTestId("active-role")).toHaveText("Medarbejder");

  await page.reload();
  await expect(page.getByTestId("members")).toContainText(learnerEmail);
  await learnerContext.close();
});

test("a PERSONAL (B2C) account cannot open the members page", async ({ page }) => {
  await signInWithMagicLink(page, newEmail("solo"));
  await page.goto("/virksomhed/medarbejdere");
  await expect(page).toHaveURL(/\/konto\?fejl=adgang/);
});

test("an expired or unknown invitation shows a clear message", async ({ page }) => {
  await page.goto("/invitation/does-not-exist");
  await expect(page.getByRole("alert").filter({ hasText: "udløbet" })).toBeVisible();
});
