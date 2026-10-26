import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.schema";
import { previewAccessAllowed } from "@/server/auth/preview-access";

// Preview sign-in (/api/dev/adgang) must never work in production, and is off unless explicitly enabled.

const valid = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/greb?sslmode=require",
  BETTER_AUTH_SECRET: "x".repeat(32),
};
const prodExtras = { SENTRY_DSN: "https://abc@o1.ingest.de.sentry.io/1", INNGEST_SIGNING_KEY: "k", INNGEST_EVENT_KEY: "e", RESEND_API_KEY: "re_1", ANTHROPIC_API_KEY: "sk-ant-test" };

describe("preview access", () => {
  it("env validation refuses PREVIEW_AUTO_LOGIN in production", () => {
    expect(() => parseServerEnv({ ...valid, ...prodExtras, NODE_ENV: "production", VERCEL_ENV: "production", PREVIEW_AUTO_LOGIN: "1" })).toThrow(/PREVIEW_AUTO_LOGIN/);
  });

  it("is off by default and only on with the flag outside production", () => {
    expect(parseServerEnv(valid).PREVIEW_AUTO_LOGIN).toBe(false);
    expect(previewAccessAllowed({ PREVIEW_AUTO_LOGIN: false, VERCEL_ENV: "preview" })).toBe(false);
    expect(previewAccessAllowed({ PREVIEW_AUTO_LOGIN: true, VERCEL_ENV: "preview" })).toBe(true);
    expect(previewAccessAllowed({ PREVIEW_AUTO_LOGIN: true, VERCEL_ENV: undefined })).toBe(true);
    expect(previewAccessAllowed({ PREVIEW_AUTO_LOGIN: true, VERCEL_ENV: "production" })).toBe(false);
  });
});
