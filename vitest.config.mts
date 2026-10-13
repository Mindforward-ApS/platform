import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://greb@127.0.0.1:5435/greb_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside the React server condition; tests run server code directly.
      "server-only": fileURLToPath(new URL("./tests/fixtures/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/setup.ts"],
          // One shared database: run files serially so tests do not race on rows.
          fileParallelism: false,
          env: {
            TEST_DATABASE_URL: testDatabaseUrl,
            DATABASE_URL: testDatabaseUrl,
            BETTER_AUTH_SECRET: "integration-test-secret-integration-test",
            APP_URL: "http://localhost:3000",
            EMAIL_TRANSPORT: "log",
          },
        },
      },
    ],
    // No real third-party network calls in tests (CLAUDE.md).
    unstubGlobals: true,
  },
});
