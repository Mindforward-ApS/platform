import { describe, expect, it } from "vitest";
import { EnvValidationError, parseServerEnv } from "@/lib/env.schema";

const valid = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/greb?sslmode=require",
  BETTER_AUTH_SECRET: "x".repeat(32),
};

const prodExtras = {
  SENTRY_DSN: "https://abc@o1.ingest.de.sentry.io/1",
  INNGEST_SIGNING_KEY: "signkey-prod-abc",
  INNGEST_EVENT_KEY: "evt",
  RESEND_API_KEY: "re_123",
};

describe("parseServerEnv", () => {
  it("accepts a minimal valid M0 environment", () => {
    const env = parseServerEnv(valid);
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.ENABLE_DEBUG_ROUTES).toBe(false);
  });

  it("names the missing variable", () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    expect(() => parseServerEnv(rest)).toThrow(EnvValidationError);
    expect(() => parseServerEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("names the invalid variable", () => {
    expect(() => parseServerEnv({ ...valid, APP_URL: "not a url" })).toThrow(/APP_URL/);
  });

  it("treats empty strings as missing", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-postgres database url", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
  });

  it("lists every problem at once", () => {
    try {
      parseServerEnv({ NODE_ENV: "test" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      const e = err as EnvValidationError;
      expect(e.variables).toEqual(expect.arrayContaining(["APP_URL", "DATABASE_URL"]));
    }
  });

  it("requires Sentry and Inngest keys in Vercel production", () => {
    expect(() => parseServerEnv({ ...valid, NODE_ENV: "production", VERCEL_ENV: "production" })).toThrow(
      /SENTRY_DSN|INNGEST_SIGNING_KEY|INNGEST_EVENT_KEY/,
    );
    const env = parseServerEnv({ ...valid, ...prodExtras, NODE_ENV: "production", VERCEL_ENV: "production" });
    expect(env.VERCEL_ENV).toBe("production");
  });

  it("never enables debug routes in production", () => {
    expect(() =>
      parseServerEnv({
        ...valid,
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        ...prodExtras,
        ENABLE_DEBUG_ROUTES: "1",
      }),
    ).toThrow(/ENABLE_DEBUG_ROUTES/);
  });

  it("requires a strong BETTER_AUTH_SECRET", () => {
    expect(() => parseServerEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("requires OAuth client id and secret together", () => {
    expect(() => parseServerEnv({ ...valid, GOOGLE_CLIENT_ID: "id" })).toThrow(/GOOGLE_CLIENT_SECRET/);
    expect(() => parseServerEnv({ ...valid, MICROSOFT_CLIENT_SECRET: "s" })).toThrow(/MICROSOFT_CLIENT_ID/);
  });

  it("requires Resend in production and forbids other transports", () => {
    const { RESEND_API_KEY: _r, ...noResend } = prodExtras;
    expect(() => parseServerEnv({ ...valid, ...noResend, NODE_ENV: "production", VERCEL_ENV: "production" })).toThrow(/RESEND_API_KEY/);
    expect(() =>
      parseServerEnv({ ...valid, ...prodExtras, NODE_ENV: "production", VERCEL_ENV: "production", EMAIL_TRANSPORT: "file" }),
    ).toThrow(/EMAIL_TRANSPORT/);
  });

  it("defaults the magic link lifetime to 15 minutes", () => {
    expect(parseServerEnv(valid).MAGIC_LINK_EXPIRES_MIN).toBe(15);
  });
});
