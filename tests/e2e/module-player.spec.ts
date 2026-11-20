import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { loginWithCode } from "./login";

// "Gennemfør core-prompt-01": runs against GRADER_MOCK=1 (fixed passing rubric) and CLICK_TASK_MOCK=1.

async function signIn(page: Page) {
  const email = `player-${randomUUID().slice(0, 8)}@example.test`;
  await loginWithCode(page, email);
  await expect(page).toHaveURL(/\/hjem$/);
}

const next = (page: Page) => page.getByRole("button", { name: "Næste", exact: true }).click();
const answer = (page: Page) => page.getByRole("button", { name: "Svar", exact: true }).click();

test("gennemfør core-prompt-01 og se bestået-skærmen med kriterier", async ({ page }) => {
  await signIn(page);
  await page.getByRole("navigation", { name: "Hovedmenu" }).getByRole("link", { name: "Moduler", exact: true }).click();
  await expect(page.getByTestId("module-list")).toContainText("Din første gode prompt");
  await page.locator('a[href="/modul/core-prompt-01"]').first().click();
  await expect(page).toHaveURL(/\/modul\/core-prompt-01$/);
  await page.getByRole("button", { name: "Start modulet" }).click();

  // READ
  await expect(page.getByRole("heading", { name: "Hvorfor prompten betyder noget" })).toBeVisible();
  await page.getByRole("button", { name: "Videre" }).click();

  // CLICK_TASK in opgavevisning: the embedded sandbox (desktop) with the disclaimer. Solve it there — every event is
  // tagged with the step id — then take hint 1 (free) and check (mocked evaluator).
  await expect(page.getByRole("heading", { name: "Start en ny samtale med Nordlys' skrivestil" })).toBeVisible();
  const sandbox = page.getByTestId("step-sandbox");
  await expect(sandbox.getByTestId("sandbox-disclaimer")).toHaveText("Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google.");
  await sandbox.getByTestId("sandbox-nav").getByRole("button", { name: "Ny chat" }).click();
  await sandbox.getByRole("button", { name: "Tilføj og forbind" }).click();
  await sandbox.getByRole("menuitem", { name: /Tilføj fotos og filer/ }).click();
  const attached = page.waitForResponse((r) => /\/api\/sandbox\/[^/]+\/actions$/.test(r.url()) && (r.request().postDataJSON() as { event?: { type?: string } }).event?.type === "CHAT_FILE_ATTACHED");
  await sandbox.getByRole("button", { name: /Tone of voice Nordlys/ }).click();
  const response = await attached;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toMatchObject({ event: { stepId: "ny-samtale", payload: { fileId: "f11" } } });
  await page.getByRole("button", { name: "Vis hint 1" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Hint 1" })).toBeVisible();
  await page.getByRole("button", { name: "Tjek", exact: true }).click();
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

test("sandkassetrin på mobil: 'Fortsæt på computer' i stedet for øvemiljøet, og opgaven kan springes over", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/modul/core-prompt-01");
  await page.getByRole("button", { name: "Start modulet" }).click();
  await page.getByRole("button", { name: "Videre" }).click();

  await expect(page.getByRole("heading", { name: "Start en ny samtale med Nordlys' skrivestil" })).toBeVisible();
  await expect(page.getByTestId("sandbox-desktop-only")).toContainText("Fortsæt på computer");
  await expect(page.getByTestId("step-sandbox")).toBeHidden();
  await expect(page.getByRole("button", { name: "Tjek", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Spring over (0 point)" }).click();
  await expect(page.getByText("Sprunget over — 0 point.")).toBeVisible();
  await expect(page.getByTestId("sandbox-desktop-only")).toHaveCount(0);
});
