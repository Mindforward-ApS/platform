import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// AES-256-GCM for small secrets at rest (TOTP seeds). Key derived from BETTER_AUTH_SECRET with HKDF.
const INFO = "greb:secret-box:v1";

function deriveKey(masterSecret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", masterSecret, "greb", INFO, 32));
}

export function encryptSecret(plaintext: string, masterSecret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(masterSecret), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptSecret(sealed: string, masterSecret: string): string {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Unsupported secret format");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(masterSecret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
