import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { waitForLink } from "./outbox";

// "Gennemfør core-prompt-01": runs against GRADER_MOCK=1 (fixed passing rubric) and CLICK_TASK_MOCK=1.

async function signIn(page: Page) {
  const email = `player-${randomUUID().slice(0, 8)}@example.test`;
  await page.goto("/opret");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send login-link" }).click();
  await expect(page.getByRole("heading", { name: "Tjek din mail" })).toBeVisible();
  await page.goto(await waitForLink(email, "magic-link"));
  await expect(page).toHaveURL(/\/konto$/);
}

const next = (page: Page) => page.getByRole("button", { name: "Næste", exact: true }).click();
const answer = (page: Page) => page.getByRole("button", { name: "Svar", exact: true }).click();

test("gennemfør core-prompt-01 og se bestået-skærmen med kriterier", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Se moduler" }).click();
  await expect(page.getByTestId("module-list")).toContainText("Din første gode prompt");
  await page.locator('a[href="/modul/core-prompt-01"]').first().click();
  await expect(page).toHaveURL(/\/modul\/core-prompt-01$/);
  await page.getByRole("button", { name: "Start modulet" }).click();

  // READ
  await expect(page.getByRole("heading", { name: "Hvorfor prompten betyder noget" })).toBeVisible();
  await page.getByRole("button", { name: "Videre" }).click();

  // CLICK_TASK (mocked evaluator): take hint 1 (free), then check.
  await expect(page.getByRole("heading", { name: "Start en ny samtale med Nordlys' skrivestil" })).toBeVisible();
  await page.getByRole("button", { name: "Vis hint 1" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Hint 1" })).toBeVisible();
  await page.getByRole("button", { name: "Tjek" }).click();
  await expect(page.getByTestId("step-result-ny-samtale")).toContainText("Bestået");
  await next(page);

  // READ
  await page.getByRole("button", { name: "Videre" }).click();

  // QUIZ single
  await page.getByLabel(/Skriv et udkast til et svar på klagen fra Hanne/).check();
  await answer(page);
  await expect(page.getByTestId("step-result-bedste-prompt")).toContainText("Bestået");
  await next(page);

  // PROMPT_TASK (mocked grader)
  await page
    .getByRole("textbox", { name: "Din prompt" })
    .fill("Skriv et udkast til et svar på klagen fra Hanne hos Bølgegrøn Kaffe. Tre leverancer kom for sent, fordi fragtpartneren er forsinket. Næste levering er fredag kl. 7–10. Venlig tone, maks 120 ord. Lov ikke kompensation.");
  await page.getByRole("button", { name: "Send til bedømmelse" }).click();
  await expect(page.getByTestId("rubric-criteria")).toContainText("Tydelig opgave");
  await expect(page.getByTestId("rubric-criteria")).toContainText("Opfyldt");
  await next(page);

  // SPOT_ERROR
  for (const text of ["Næste levering er mandag", "I alt drejer det sig om 36 kasser", "Nordlys har tilbudt kunden 10 %"]) {
    const button = page.getByRole("button", { name: new RegExp(text) });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await answer(page);
  await expect(page.getByTestId("step-result-find-fejlene")).toContainText("Bestået");
  await next(page);

  // JUDGMENT (must-pass)
  await page.getByLabel(/Hun bør bruge Nordlys' godkendte AI-værktøj/).check();
  await answer(page);
  await expect(page.getByTestId("step-result-maa-du")).toContainText("Bestået");
  await next(page);

  // QUIZ multi
  for (const label of ["Hvad AI'en skal lave", "De fakta, AI'en ikke selv kan kende", "Hvordan svaret skal se ud (længde, form)", "Hvad AI'en ikke må skrive eller love"]) {
    await page.getByLabel(label).check();
  }
  await answer(page);
  await expect(page.getByTestId("step-result-hvad-hoerer-til")).toContainText("Bestået");

  await page.getByRole("button", { name: "Se dit resultat" }).click();
  const result = page.getByTestId("module-result");
  await expect(result.getByRole("heading", { name: "Dit resultat: Bestået" })).toBeVisible();
  await expect(result).toContainText("Du fik 100 %");
  await expect(result.getByTestId("result-criteria")).toContainText("Relevant kontekst");

  // The list now shows the module as passed.
  await page.goto("/moduler");
  await expect(page.getByTestId("module-list")).toContainText("Bestået");
});
