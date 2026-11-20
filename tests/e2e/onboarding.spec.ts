import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { enterCode } from "./login";

// Sign-up + onboarding (approved preview, Marco 11 Nov 2026): one question per screen, 6-digit code by email.

const newEmail = (label: string) => `${label}-${randomUUID().slice(0, 8)}@example.test`;

async function signUp(page: Page, type: "privat" | "virksomhed", email: string) {
  await page.goto(`/opret?type=${type}`);
  await page.getByLabel("Fornavn").fill("Sofie");
  await page.getByLabel("Efternavn").fill("Hansen");
  await page.getByLabel("Telefonnummer").fill("12 34 56 78");
  await page.getByLabel(type === "privat" ? "E-mailadresse" : "Arbejdsmail").fill(email);
  await page.getByRole("button", { name: "Tilmeld" }).click();
  await expect(page.getByRole("heading", { name: "Bekræft din e-mail" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await enterCode(page, email);
  await expect(page.getByRole("heading", { name: "Velkommen, Sofie" })).toBeVisible();
  await page.getByRole("link", { name: "Fortsæt" }).click();
}

test("the first screen asks who it is for; ?type= skips it", async ({ page }) => {
  await page.goto("/opret");
  await expect(page.getByRole("heading", { name: "Hvem skal bruge Mindforward?" })).toBeVisible();
  await page.getByRole("link", { name: /Til min virksomhed/ }).click();
  await expect(page.getByRole("heading", { name: "Opret jeres konto" })).toBeVisible();
  await page.goto("/opret?type=privat");
  await expect(page.getByRole("heading", { name: "Opret din konto" })).toBeVisible();
});

test("privat: code → membership → start from scratch → tool → plan → first lesson", async ({ page }) => {
  await signUp(page, "privat", newEmail("privat"));
  await expect(page.getByRole("heading", { name: "Vælg dit medlemskab" })).toBeVisible();
  await page.getByText("Studerende eller jobsøgende").click();
  await page.getByLabel("Studiemail").fill("sofie@student.example.test");
  await page.getByRole("button", { name: "Fortsæt" }).click();

  await expect(page.getByRole("heading", { name: "Hvor vil du starte?" })).toBeVisible();
  await page.getByText("Start fra bunden").click();
  await page.getByRole("button", { name: "Fortsæt" }).click();

  await expect(page.getByRole("heading", { name: "Hvilket værktøj vil du lære?" })).toBeVisible();
  await page.getByText("ChatGPT", { exact: true }).click();
  await page.getByRole("button", { name: "Fortsæt" }).click();

  await expect(page.getByRole("heading", { name: "Din plan er klar" })).toBeVisible();
  await expect(page.getByTestId("onboarding-plan")).toContainText("ChatGPT");
  await expect(page.getByTestId("onboarding-membership")).toContainText("Studerende eller jobsøgende");
  await page.getByRole("button", { name: "Start første lektion" }).click();
  await expect(page).toHaveURL(/\/forloeb\/chatgpt/);
});

test("erhverv: code → company + team size (creates the business) → invite (skippable) → tool → plan", async ({ page }) => {
  await signUp(page, "virksomhed", newEmail("erhverv"));
  await expect(page.getByRole("heading", { name: "Om jeres virksomhed" })).toBeVisible();
  await page.getByLabel("Virksomhedens navn").fill("Onboarding Firma ApS");
  await page.getByText("1–9 brugere").click();
  await page.getByRole("button", { name: "Fortsæt" }).click();

  await expect(page.getByRole("heading", { name: "Inviter dit hold" })).toBeVisible();
  // The data processing agreement must be accepted before invitations (docs/10 § 1.2).
  await expect(page.getByText("databehandleraftalen").first()).toBeVisible();
  await page.getByRole("link", { name: "Spring over" }).click();

  await expect(page.getByRole("heading", { name: "Hvor vil du starte?" })).toBeVisible();
  await page.getByText("Start fra bunden").click();
  await page.getByRole("button", { name: "Fortsæt" }).click();
  await page.getByText("Copilot", { exact: true }).click();
  await page.getByRole("button", { name: "Fortsæt" }).click();

  await expect(page.getByRole("heading", { name: "Din plan er klar" })).toBeVisible();
  await expect(page.getByText("Mit hold")).toBeVisible();
  await page.goto("/konto");
  await expect(page.getByTestId("active-org")).toContainText("Onboarding Firma ApS");
  await expect(page.getByTestId("active-role")).toHaveText("Ejer");
});
