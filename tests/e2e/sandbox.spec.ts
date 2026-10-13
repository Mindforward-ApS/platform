import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { waitForLink } from "./outbox";

// M3: open the free-play sandbox for the ChatGPT track and chat with the (mocked, AI_MOCK=1) practice model.
test("learner opens the sandbox from /konto, sends a chat message and sees an Øvemodel answer", async ({ page }) => {
  const email = `sandbox-${randomUUID().slice(0, 8)}@example.test`;
  const ownOrigin = new URL(test.info().project.use.baseURL ?? "http://localhost").origin;
  const external: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    // Sentry (EU ingest) is the app's own error monitoring, not sandbox traffic; it is only active when a DSN is set.
    const monitoring = url.hostname.endsWith(".ingest.de.sentry.io");
    if (url.protocol.startsWith("http") && url.origin !== ownOrigin && !monitoring) external.push(url.origin);
  });

  await page.goto("/opret");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send login-link" }).click();
  await expect(page.getByRole("heading", { name: "Tjek din mail" })).toBeVisible();
  await page.goto(await waitForLink(email, "magic-link"));
  await expect(page).toHaveURL(/\/konto$/);

  await page.getByTestId("sandbox-links").getByRole("link", { name: /ChatGPT/ }).click();
  await expect(page).toHaveURL(/\/sandkasse\/chatgpt$/);
  await expect(page.getByTestId("sandbox-disclaimer")).toHaveText("Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google.");
  await expect(page.getByTestId("sandbox-nav").getByRole("button", { name: "Ny chat" })).toBeVisible();

  // Client-side PII block: never sent.
  await page.getByLabel("Skriv til Øvemodel …").fill("Mit CPR er 010190-1234");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("pii-blocked")).toContainText("CPR-nummer");

  await page.getByLabel("Skriv til Øvemodel …").fill("Hvem er du?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("model-label").first()).toHaveText("Øvemodel");
  await expect(page.getByTestId("sandbox-chat")).toContainText("Dette er et testsvar fra øvemodellen.");
  await expect(page.getByTestId("sandbox-disclaimer")).toBeVisible();

  // Reload: the conversation is restored from the session's own events.
  await page.reload();
  await expect(page.getByTestId("sandbox-chat")).toContainText("Hvem er du?");
  expect(external).toEqual([]);
});
