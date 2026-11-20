import { defineConfig, devices } from "@playwright/test";

process.env.DATABASE_URL ??= "postgresql://greb@127.0.0.1:5435/greb_e2e";
process.env.BETTER_AUTH_SECRET ??= "e2e-secret-e2e-secret-e2e-secret-e2e-xx";
// M8: unsubscribe tokens + suppression hashes (shared with tests/e2e/monthly-marketing.spec.ts).
process.env.UNSUBSCRIBE_TOKEN_SECRET ??= "e2e-unsubscribe-secret-e2e-unsubscribe";
process.env.EMAIL_HASH_PEPPER ??= "e2e-pepper-e2e-pepper";

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
        env: {
          APP_URL: baseURL,
          NEXT_PUBLIC_APP_URL: baseURL,
          EMAIL_TRANSPORT: "file",
          EMAIL_OUTBOX_DIR: process.env.EMAIL_OUTBOX_DIR ?? ".e2e-outbox",
          EMAIL_ALLOWLIST: "@example.test",
          // M4: play IN_REVIEW modules; deterministic grader + CLICK_TASK evaluator (no LLM, no sandbox).
          ALLOW_UNPUBLISHED_MODULES: "1",
          GRADER_MOCK: "1",
          CLICK_TASK_MOCK: "1",
          // M6: fake Stripe + inline billing jobs (no keys, no Inngest Dev Server in e2e).
          STRIPE_MOCK: "1",
          JOBS_INLINE: "1",
          // M3: all LLM calls are mocked.
          AI_MOCK: "1",
          // M8: /afmeld + one-click unsubscribe, suppression list.
          UNSUBSCRIBE_TOKEN_SECRET: process.env.UNSUBSCRIBE_TOKEN_SECRET ?? "",
          EMAIL_HASH_PEPPER: process.env.EMAIL_HASH_PEPPER ?? "",
        },
      },
});
