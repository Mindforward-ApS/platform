import { gunzipSync, gzipSync } from "node:zlib";
import type { PrismaClient, SnapshotOrigin } from "@/generated/prisma/client";
import { contentHash, parsedEntrySchema, type ParsedEntry } from "./normalize";

// SourceSnapshot (docs/06 § 3): raw response gzip'ed, entries as JSON, contentHash over sorted entry hashes.
// Unique (sourceId, contentHash) → the same content is never stored twice.

export interface SnapshotInput {
  sourceId: string;
  fetchedAt: Date;
  httpStatus: number;
  etag: string | null;
  origin: SnapshotOrigin;
  parserVersion: string;
  raw: Buffer;
  entries: ParsedEntry[];
}

export type SnapshotResult =
  | { unchanged: true; contentHash: string }
  | { unchanged: false; contentHash: string; snapshotId: string; previousEntries: ParsedEntry[] | null };

export const gzip = (raw: Buffer) => gzipSync(raw);
export const gunzip = (raw: Uint8Array) => gunzipSync(raw);

export function snapshotEntries(json: unknown): ParsedEntry[] {
  return parsedEntrySchema.array().parse(json);
}

export async function storeSnapshot(db: PrismaClient, input: SnapshotInput): Promise<SnapshotResult> {
  const hash = contentHash(input.entries);
  const latest = await db.sourceSnapshot.findFirst({ where: { sourceId: input.sourceId }, orderBy: { fetchedAt: "desc" }, select: { contentHash: true, entries: true } });
  if (latest?.contentHash === hash) return { unchanged: true, contentHash: hash };
  const existing = await db.sourceSnapshot.findUnique({ where: { sourceId_contentHash: { sourceId: input.sourceId, contentHash: hash } }, select: { id: true } });
  if (existing) return { unchanged: true, contentHash: hash }; // content reverted to an older, already-diffed state
  const snapshot = await db.sourceSnapshot.create({
    data: {
      sourceId: input.sourceId,
      fetchedAt: input.fetchedAt,
      httpStatus: input.httpStatus,
      etag: input.etag,
      origin: input.origin,
      parserVersion: input.parserVersion,
      contentHash: hash,
      raw: new Uint8Array(gzip(input.raw)),
      entries: input.entries,
    },
  });
  return { unchanged: false, contentHash: hash, snapshotId: snapshot.id, previousEntries: latest ? snapshotEntries(latest.entries) : null };
}
