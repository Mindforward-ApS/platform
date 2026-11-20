import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/server/auth/secret-box";

const key = "unit-test-secret-unit-test-secret-1234";

describe("secret-box", () => {
  it("round-trips a TOTP secret", () => {
    const sealed = encryptSecret("JBSWY3DPEHPK3PXP", key);
    expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(sealed, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same", key)).not.toBe(encryptSecret("same", key));
  });

  it("fails on tampering or a wrong key", () => {
    const sealed = encryptSecret("JBSWY3DPEHPK3PXP", key);
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("A") ? "B" : "A") + sealed.slice(-1);
    expect(() => decryptSecret(tampered, key)).toThrow();
    expect(() => decryptSecret(sealed, "another-key-another-key-another-key")).toThrow();
  });
});
