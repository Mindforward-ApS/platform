import { defineConfig, devices } from "@playwright/test";

process.env.DATABASE_URL ??= "postgresql://greb@127.0.0.1:5435/greb_e2e";
process.env.BETTER_AUTH_SECRET ??= "e2e-secret-e2e-secret-e2e-secret-e2e-xx";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", locale: "da-DK" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Mail goes to files the tests read; only @example.test may receive it.
        env: { APP_URL: baseURL, NEXT_PUBLIC_APP_URL: baseURL, EMAIL_TRANSPORT: "file", EMAIL_OUTBOX_DIR: ".e2e-outbox", EMAIL_ALLOWLIST: "@example.test" },
      },
});
