import "server-only";
import { createHash } from "node:crypto";

// Client IP + user agent from request headers, same header order as Better Auth (src/server/auth/better-auth.ts).
// On Vercel x-vercel-forwarded-for is set by the platform; elsewhere the first x-forwarded-for hop.

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

export function requestMeta(headers: Headers): RequestMeta {
  const raw = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip") ?? headers.get("x-forwarded-for");
  const ip = raw?.split(",")[0]?.trim().slice(0, 64) || null;
  return { ip, userAgent: headers.get("user-agent")?.slice(0, 500) ?? null };
}

/** Rate-limit key part: never the raw IP/email. */
export function hashKey(value: string | null): string {
  return createHash("sha256")
    .update((value ?? "unknown").trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}
