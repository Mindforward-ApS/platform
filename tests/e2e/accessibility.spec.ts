import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loginWithCode } from "./login";

// Launch gate P9: no serious or critical WCAG 2.1 AA violations on the public pages and the main learner screens.

const PUBLIC = ["/", "/niveautest", "/niveautest/chatgpt", "/hjaelp", "/privatliv", "/cookies", "/handelsbetingelser", "/tilgaengelighed", "/underdatabehandlere", "/log-ind", "/opret", "/opret?type=privat", "/opret?type=virksomhed", "/fortryd-aftale"];
const LEARNER = ["/hjem", "/moduler", "/plan", "/certifikater", "/konto", "/konto/data", "/sandkasse/chatgpt", "/sandkasse/claude", "/sandkasse/copilot", "/profil/virksomhed", "/profil/branche"];

async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const banner = page.getByRole("button", { name: "Kun nødvendige" });
  if (await banner.count()) await banner.click();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${path}\n${summary.join("\n")}`).toEqual([]);
}

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  for (const path of PUBLIC) test(`public ${path}`, async ({ page }) => audit(page, path));

  test("learner screens", async ({ page }) => {
    const email = `a11y-${randomUUID().slice(0, 8)}@example.test`;
    await loginWithCode(page, email);
    await expect(page).toHaveURL(/\/hjem$/);
    for (const path of LEARNER) await audit(page, path);
  });
});
