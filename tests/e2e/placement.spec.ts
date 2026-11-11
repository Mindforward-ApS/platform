import { randomInt, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { waitForLink } from "./outbox";
import { enterCode } from "./login";

// M5: public placement test (lead magnet) → result without consent → voluntary double opt-in → save + signup → plan.

const newEmail = (label: string) => `${label}-${randomUUID().slice(0, 8)}@example.test`;
// Each test gets its own client IP so the 10/hour per-IP limit never leaks between runs.
const randomIp = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
const MIN_SECONDS_MS = 10_500; // placementConfig.minCompletionSeconds + margin

// The bot-protection minimum time makes these flows longer than the default 30 s.
test.describe.configure({ timeout: 90_000 });

async function takeTest(page: Page, track: "ChatGPT" | "Microsoft 365 Copilot" = "ChatGPT") {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  await page.goto("/niveautest");
  await page.getByRole("link", { name: track, exact: true }).click();
  await expect(page.getByTestId("progress")).toHaveText("0 af 12 besvaret");
  const started = Date.now();
  await page.getByRole("radio", { name: "Salg" }).check();
  if (track === "Microsoft 365 Copilot") await page.getByRole("radio", { name: "Nej, kun Copilot Chat" }).check();
  for (let i = 1; i <= 12; i++) await page.locator(`input[type=radio][name=q${String(i).padStart(2, "0")}]`).first().check();
  await expect(page.getByTestId("progress")).toHaveText("12 af 12 besvaret");
  await page.waitForTimeout(Math.max(0, MIN_SECONDS_MS - (Date.now() - started)));
  await page.getByRole("button", { name: "Se mit resultat" }).click();
  await expect(page).toHaveURL(/\/niveautest\/resultat/);
}

test("public test → result is shown without consent; checkbox is NOT pre-ticked; double opt-in confirms", async ({ page }) => {
  await takeTest(page);
  await expect(page.getByRole("heading", { name: "Dit resultat", exact: true })).toBeVisible();
  await expect(page.getByTestId("result-overall")).toContainText("Dit niveau:");
  await expect(page.getByTestId("result-areas").getByRole("listitem")).toHaveCount(5);
  await expect(page.getByTestId("result-recommendations").getByRole("listitem")).toHaveCount(3);
  await expect(page.getByTestId("result-plan").getByRole("listitem").first()).toBeVisible();

  const checkbox = page.getByTestId("marketing-consent");
  await expect(checkbox).not.toBeChecked();

  // Without the tick nothing is recorded.
  const email = newEmail("lead");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Tilmeld" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Sæt kryds" })).toBeVisible();

  await page.getByTestId("marketing-consent").check();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Tilmeld" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Klik på linket i mailen" })).toBeVisible();

  await page.goto(await waitForLink(email, "marketing-confirm"));
  await expect(page.getByRole("heading", { name: "Bekræft din tilmelding" })).toBeVisible();
  await page.getByRole("button", { name: "Bekræft tilmelding" }).click();
  await expect(page.getByText("din tilmelding er bekræftet")).toBeVisible();
});

test("'Gem resultat og fortsæt gratis' → sign-up with a code keeps the result and shows the plan", async ({ page }) => {
  await takeTest(page, "Microsoft 365 Copilot");
  const save = page.getByRole("link", { name: "Gem resultat og fortsæt gratis" });
  await expect(save).toHaveAttribute("href", "/opret?next=/plan");
  await page.goto("/opret?next=/plan");
  const email = newEmail("saver");
  await expect(page.getByRole("heading", { name: "Opret din konto" })).toBeVisible();
  await page.getByLabel("Fornavn").fill("Gem");
  await page.getByLabel("Efternavn").fill("Resultat");
  await page.getByLabel("Telefonnummer").fill("12 34 56 78");
  await page.getByLabel("E-mailadresse").fill(email);
  await page.getByRole("button", { name: "Tilmeld" }).click();
  await expect(page.getByRole("heading", { name: "Bekræft din e-mail" })).toBeVisible();
  await enterCode(page, email);

  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByTestId("plan-track")).toContainText("Microsoft 365 Copilot");
  await expect(page.getByTestId("plan-LEVEL_1")).toContainText("Hvad en sprogmodel er");
  await expect(page.getByTestId("plan-ROLE")).toContainText("Salg");
  // Copilot Chat only: paid-license modules are not in the plan.
  await expect(page.getByText("Copilot i Office-apps og arbejdsdata")).toHaveCount(0);

  // The anonymous cookie was consumed; the result now belongs to the account.
  await page.goto("/niveautest/resultat");
  await expect(page.getByRole("link", { name: "Se din plan" })).toBeVisible();
});

test("legal pages are marked as drafts and the cookie banner defaults to necessary-only", async ({ page }) => {
  for (const path of ["/privatliv", "/cookies", "/handelsbetingelser", "/tilgaengelighed"]) {
    await page.goto(path);
    await expect(page.getByTestId("legal-draft")).toHaveText("Udkast — afventer advokatgennemgang");
    await expect(page.getByRole("navigation", { name: "Juridisk og info" })).toBeVisible();
  }

  const banner = page.getByTestId("cookie-banner");
  await expect(banner).toBeVisible();
  const necessary = banner.getByRole("button", { name: "Kun nødvendige" });
  const statistics = banner.getByRole("button", { name: "Accepter statistik" });
  // Equally prominent: identical styling.
  expect(await necessary.getAttribute("class")).toBe(await statistics.getAttribute("class"));
  await necessary.click();
  await expect(banner).toBeHidden();
  const cookie = (await page.context().cookies()).find((c) => c.name === "greb_cookie_choice");
  expect(cookie?.value).toBe("v1.necessary");
  await page.reload();
  await expect(page.getByTestId("cookie-banner")).toBeHidden();
  await page.getByRole("button", { name: "Cookieindstillinger" }).click();
  await expect(page.getByTestId("cookie-banner")).toBeVisible();
});
