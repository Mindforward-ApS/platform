import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { placementConfig } from "@/lib/config/placement";

// Bot protection + anonymous result tokens for the public placement test (docs/02 § 7).

export const PLACEMENT_COOKIE = "greb_placement";

function startKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("placement-start:v1").digest();
}

/** Signed render time, put in a hidden field: `<ms>.<sig>`. */
export function signStartToken(track: string, nowMs: number, secret: string): string {
  const sig = createHmac("sha256", startKey(secret)).update(`${track}:${nowMs}`).digest("base64url");
  return `${nowMs}.${sig}`;
}

export type StartCheck = { ok: true; elapsedSeconds: number } | { ok: false; reason: "INVALID" | "TOO_FAST" | "EXPIRED" };

export function checkStartToken(token: string, track: string, nowMs: number, secret: string, rules = placementConfig): StartCheck {
  const [msText, sig] = token.split(".");
  const ms = Number(msText);
  if (!sig || !Number.isSafeInteger(ms)) return { ok: false, reason: "INVALID" };
  const expected = Buffer.from(signStartToken(track, ms, secret).split(".")[1] ?? "");
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "INVALID" };
  const elapsedSeconds = (nowMs - ms) / 1000;
  if (elapsedSeconds < rules.minCompletionSeconds) return { ok: false, reason: "TOO_FAST" };
  if (elapsedSeconds > rules.startTokenMaxAgeSeconds) return { ok: false, reason: "EXPIRED" };
  return { ok: true, elapsedSeconds };
}

/** Random cookie token; only its sha256 is stored (PlacementResult.anonymousTokenHash). */
export function newAnonymousToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashAnonymousToken(token) };
}

export function hashAnonymousToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
