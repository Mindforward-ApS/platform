import "server-only";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { httpRequest } from "@/server/http";
import { logger } from "@/server/observability/logger";
import type { CodeSystem } from "./industry-match";

// CVR lookup behind one interface, so the provider can be swapped without touching the profile flow.
// We keep only what the flow needs: company name and main industry code. Cached 30 days.

export const CVR_PATTERN = /^\d{8}$/;
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CompanyInfo {
  cvr: string;
  name: string;
  industryCode: string | null;
  codeSystem: CodeSystem;
}

export interface CompanyLookupProvider {
  readonly name: string;
  lookup(cvr: string): Promise<CompanyInfo | null>;
}

/** Fictional companies for dev/test. Numbers start with 0000000, so they can never be real CVR numbers. */
export const FIXTURE_COMPANIES: readonly CompanyInfo[] = [
  { cvr: "00000001", name: "Østergaard Landbrug I/S (fiktiv)", industryCode: "011100", codeSystem: "DB25" },
  { cvr: "00000002", name: "Hansen & Søn VVS ApS (fiktiv)", industryCode: "432200", codeSystem: "DB25" },
  { cvr: "00000003", name: "Revisionsfirmaet Bjerre ApS (fiktiv)", industryCode: "692000", codeSystem: "DB25" },
  { cvr: "00000004", name: "Hjem & Hygge Webshop ApS (fiktiv)", industryCode: "479100", codeSystem: "DB07" },
  { cvr: "00000005", name: "Fjordlys Rådgivning ApS (fiktiv)", industryCode: "702200", codeSystem: "DB07" },
];

export const fixtureProvider: CompanyLookupProvider = {
  name: "fixture",
  async lookup(cvr) {
    return FIXTURE_COMPANIES.find((c) => c.cvr === cvr) ?? null;
  },
};

// Erhvervsstyrelsen "system-til-system" (Elasticsearch). Requires a signed agreement + credentials.
// Not exercised until the agreement is in place (docs/OPEN-QUESTIONS.md); response shape validated with Zod.
const erstHit = z.object({
  hits: z.object({
    hits: z.array(
      z.object({
        _source: z.object({
          Vrvirksomhed: z.object({
            cvrNummer: z.union([z.number(), z.string()]),
            virksomhedMetadata: z.object({
              nyesteNavn: z.object({ navn: z.string() }).nullable().optional(),
              nyesteHovedbranche: z.object({ branchekode: z.string() }).nullable().optional(),
            }),
          }),
        }),
      }),
    ),
  }),
});

export function erstProvider(credentials: { user: string; password: string }, url = "https://distribution.virk.dk/cvr-permanent/virksomhed/_search"): CompanyLookupProvider {
  return {
    name: "erst",
    async lookup(cvr) {
      const res = await httpRequest(url, {
        service: "cvr-erst",
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${credentials.user}:${credentials.password}`).toString("base64")}` },
        body: JSON.stringify({ query: { term: { "Vrvirksomhed.cvrNummer": Number(cvr) } }, size: 1 }),
        // Elasticsearch search is a read: safe to retry.
        idempotencyKey: `cvr-${cvr}`,
        timeoutMs: 8000,
      });
      if (!res.ok) throw new Error(`cvr-erst ${res.status}`);
      const parsed = erstHit.parse(await res.json());
      const v = parsed.hits.hits[0]?._source.Vrvirksomhed;
      if (!v) return null;
      return { cvr, name: v.virksomhedMetadata.nyesteNavn?.navn ?? cvr, industryCode: v.virksomhedMetadata.nyesteHovedbranche?.branchekode ?? null, codeSystem: "DB25" };
    },
  };
}

const cachedPayload = z.object({ name: z.string(), industryCode: z.string().nullable(), codeSystem: z.enum(["DB25", "DB07"]) });

/** Cache first (30 days), then the provider. Failures are logged and treated as "not found" (the picker takes over). */
export async function cachedLookup(db: PrismaClient, provider: CompanyLookupProvider, cvr: string, now = new Date()): Promise<CompanyInfo | null> {
  if (!CVR_PATTERN.test(cvr)) return null;
  const hit = await db.companyLookupCache.findUnique({ where: { cvr } });
  if (hit && hit.provider === provider.name && now.getTime() - hit.fetchedAt.getTime() < CACHE_TTL_MS) {
    const p = cachedPayload.safeParse(hit.payload);
    if (p.success) return { cvr, ...p.data };
  }
  let info: CompanyInfo | null;
  try {
    info = await provider.lookup(cvr);
  } catch (err) {
    logger.warn("cvr.lookup_failed", { provider: provider.name, err });
    return null;
  }
  if (info) {
    const payload = { name: info.name, industryCode: info.industryCode, codeSystem: info.codeSystem };
    await db.companyLookupCache.upsert({ where: { cvr }, create: { cvr, provider: provider.name, payload, fetchedAt: now }, update: { provider: provider.name, payload, fetchedAt: now } });
  }
  return info;
}
