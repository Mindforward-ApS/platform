import "server-only";
import { headers } from "next/headers";
import type { RequestMeta } from "./checkout";

/** IP + user agent for consent/withdrawal evidence (Vercel sets x-vercel-forwarded-for). */
export async function requestMeta(): Promise<RequestMeta> {
  const h = await headers();
  const forwarded = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for");
  return { ip: forwarded?.split(",")[0]?.trim() || null, userAgent: h.get("user-agent")?.slice(0, 500) ?? null };
}
