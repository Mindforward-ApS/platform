import { describe, expect, it } from "vitest";
import { migrationDatabaseUrl } from "@/lib/migration-database-url";

describe("migrationDatabaseUrl", () => {
  it("prefers the direct URL when it is set", () => {
    expect(
      migrationDatabaseUrl({
        DATABASE_URL_UNPOOLED: "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db",
        DATABASE_URL: "postgresql://u:p@ep-x-pooler.eu-central-1.aws.neon.tech/db",
      }),
    ).toBe("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db");
  });

  it("derives the direct Neon host from the pooled URL when the direct URL is missing or empty", () => {
    const pooled = "postgresql://u:p%40ss@ep-cool-name-123-pooler.eu-central-1.aws.neon.tech/greb?sslmode=require";
    const direct = "postgresql://u:p%40ss@ep-cool-name-123.eu-central-1.aws.neon.tech/greb?sslmode=require";
    expect(migrationDatabaseUrl({ DATABASE_URL: pooled })).toBe(direct);
    expect(migrationDatabaseUrl({ DATABASE_URL_UNPOOLED: "", DATABASE_URL: pooled })).toBe(direct);
  });

  it("only touches the host, never credentials or database name", () => {
    const url = "postgresql://my-pooler.user:x-pooler.y@ep-a-pooler.eu-central-1.aws.neon.tech/db-pooler.x";
    expect(migrationDatabaseUrl({ DATABASE_URL: url })).toBe(
      "postgresql://my-pooler.user:x-pooler.y@ep-a.eu-central-1.aws.neon.tech/db-pooler.x",
    );
  });

  it("keeps a non-pooled URL unchanged (local Postgres, CI)", () => {
    const url = "postgresql://greb:greb@127.0.0.1:5432/greb_test";
    expect(migrationDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it("returns an empty string when no URL is set, so `prisma generate` still works", () => {
    expect(migrationDatabaseUrl({})).toBe("");
  });
});
