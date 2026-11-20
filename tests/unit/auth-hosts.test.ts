import { describe, expect, it } from "vitest";
import { allowedHosts, trustedOrigins } from "@/server/auth/hosts";

describe("auth hosts", () => {
  it("allows the app host, our preview pattern and production", () => {
    expect(allowedHosts("https://greb-iota.vercel.app")).toEqual(["greb-iota.vercel.app", "greb-*-esthergruppen.vercel.app"]);
    expect(allowedHosts("http://localhost:3000", "https://greb-iota.vercel.app")).toContain("greb-iota.vercel.app");
  });

  it("never trusts every vercel.app host", () => {
    expect(allowedHosts("https://greb-iota.vercel.app")).not.toContain("*.vercel.app");
  });

  it("keeps http only for a local app url", () => {
    expect(trustedOrigins("http://localhost:3000")).toEqual(["http://localhost:3000", "https://greb-*-esthergruppen.vercel.app"]);
  });
});
