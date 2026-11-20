import { describe, expect, it } from "vitest";
import { findLeaks } from "../../scripts/check-client-secrets";

describe("findLeaks", () => {
  it("flags a secret env name or value in the bundle", () => {
    expect(findLeaks('const x="BETTER_AUTH_SECRET"', {})).toEqual(["name:BETTER_AUTH_SECRET"]);
    expect(findLeaks("token=re_live_1234567890abcdef", { RESEND_API_KEY: "re_live_1234567890abcdef" })).toEqual(["value:RESEND_API_KEY"]);
  });

  it("passes a clean bundle", () => {
    expect(findLeaks("console.log('hej')", { RESEND_API_KEY: "re_live_1234567890abcdef" })).toEqual([]);
  });
});
