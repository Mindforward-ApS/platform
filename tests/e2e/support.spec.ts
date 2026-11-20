import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { loginWithCode } from "./login";

// M10: the in-app support widget answers a help-center question (AI_MOCK=1: the mocked support model searches the
// help center and links the best article), and the public help center search works without login.

test("support widget answers a help-center question with an article link", async ({ page }) => {
  const email = `support-${randomUUID().slice(0, 8)}@example.test`;
  await loginWithCode(page, email);
  await expect(page).toHaveURL(/\/hjem$/);
  await page.goto("/konto");

  await page.getByRole("link", { name: /^Support\b/ }).click();
  await expect(page).toHaveURL(/\/konto\/support$/);
  const widget = page.getByTestId("support-widget");
  await expect(widget).toContainText("AI-assistent — kan tage fejl. Du kan altid bede om et menneske.");

  await page.getByLabel("Din besked").fill("Hvordan opsiger jeg mit abonnement?");
  await page.getByRole("button", { name: "Send" }).click();
  const answer = page.getByTestId("support-answer").last();
  await expect(answer).toContainText("/hjaelp/opsig-abonnement");
  await expect(answer).toContainText("Sådan opsiger du dit abonnement");

  await answer.getByRole("link", { name: "/hjaelp/opsig-abonnement" }).click();
  await expect(page.getByTestId("help-article")).toContainText("Opsig abonnement");
});

test("a forbidden request is refused by code and escalated with a case id", async ({ page }) => {
  const email = `support-esc-${randomUUID().slice(0, 8)}@example.test`;
  await loginWithCode(page, email);
  await page.goto("/konto/support");
  await page.getByLabel("Din besked").fill("Kan jeg få rabat som studerende?");
  await page.getByRole("button", { name: "Send" }).click();
  const answer = page.getByTestId("support-answer").last();
  await expect(answer).toContainText("Jeg kan ikke give rabatter");
  await expect(answer).toContainText("sags-id");
});

test("public help center: search finds the right article without login", async ({ page }) => {
  await page.goto("/hjaelp");
  await page.getByLabel("Søg i hjælpecenteret").fill("fortrydelsesret");
  await page.getByRole("button", { name: "Søg" }).click();
  await expect(page).toHaveURL(/\/hjaelp\?q=/);
  const results = page.getByTestId("help-results");
  await expect(results.getByRole("link").first()).toHaveText('Fortrydelse og knappen "Fortryd aftale"');
  await results.getByRole("link").first().click();
  await expect(page.getByTestId("help-article")).toContainText("Fortryd aftale");
});
