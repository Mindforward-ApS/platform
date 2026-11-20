import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-next";

describe("safeNextPath (open redirect guard)", () => {
  it("allows plain paths on our own site", () => {
    expect(safeNextPath("/plan")).toBe("/plan");
    expect(safeNextPath("/profil/anbefalinger")).toBe("/profil/anbefalinger");
  });
  it.each(["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "https://evil.com", "/%5Cevil.com", "javascript:alert(1)", "", null, undefined])("rejects %j", (raw) => {
    expect(safeNextPath(raw as string | null | undefined)).toBeNull();
  });
  it("never resolves to another origin", () => {
    for (const raw of ["/plan", "/hjem"]) expect(new URL(safeNextPath(raw)!, "https://app.example").origin).toBe("https://app.example");
  });
});
