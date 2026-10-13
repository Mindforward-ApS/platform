import type { ChangeEventStatus, ChangeKind, PrismaClient } from "@/generated/prisma/client";
import { entryHash, type ParsedEntry } from "./normalize";

// Diff → ChangeEvent (docs/06 § 4). First snapshot of a source = BASELINE (stored, never classified). New key = ADDED,
// changed hash = MODIFIED (old text kept), vanished keys are only logged. > 20 new entries = anomaly → HELD.
// Entries older than 60 days are ignored. Idempotent through unique (sourceId, entryKey, entryHash).

export interface DiffEvent {
  entry: ParsedEntry;
  kind: ChangeKind;
  entryHash: string;
  previousText: string | null;
}

export interface DiffResult {
  events: DiffEvent[];
  removedKeys: string[];
  anomaly: boolean;
  ignoredOld: number;
}

export function diffEntries(previous: ParsedEntry[] | null, next: ParsedEntry[], opts: { now: Date; maxAgeDays: number; anomalyThreshold: number }): DiffResult {
  if (!previous) return { events: next.map((e) => ({ entry: e, kind: "BASELINE", entryHash: entryHash(e), previousText: null })), removedKeys: [], anomaly: false, ignoredOld: 0 };
  const before = new Map(previous.map((e) => [e.entryKey, e]));
  const cutoff = opts.now.getTime() - opts.maxAgeDays * 86_400_000;
  const events: DiffEvent[] = [];
  let ignoredOld = 0;
  for (const e of next) {
    const hash = entryHash(e);
    const old = before.get(e.entryKey);
    if (old && entryHash(old) === hash) continue;
    if (e.date && Date.parse(e.date) < cutoff) {
      ignoredOld++;
      continue;
    }
    events.push({ entry: e, kind: old ? "MODIFIED" : "ADDED", entryHash: hash, previousText: old?.text ?? null });
  }
  const nextKeys = new Set(next.map((e) => e.entryKey));
  const removedKeys = previous.filter((e) => !nextKeys.has(e.entryKey)).map((e) => e.entryKey);
  const added = events.filter((e) => e.kind === "ADDED").length;
  return { events, removedKeys, anomaly: added > opts.anomalyThreshold, ignoredOld };
}

function statusFor(kind: ChangeKind, anomaly: boolean): ChangeEventStatus {
  if (kind === "BASELINE") return "SKIPPED";
  return anomaly ? "HELD" : "NEW";
}

/** Writes the events; returns the ids of events that need processing (status NEW) for this snapshot. */
export async function recordChangeEvents(db: PrismaClient, opts: { sourceId: string; snapshotId: string; pipelineRunId: string; diff: DiffResult }): Promise<string[]> {
  const { diff } = opts;
  if (diff.events.length > 0) {
    await db.changeEvent.createMany({
      skipDuplicates: true,
      data: diff.events.map((ev) => ({
        sourceId: opts.sourceId,
        snapshotId: opts.snapshotId,
        pipelineRunId: opts.pipelineRunId,
        entryKey: ev.entry.entryKey,
        entryHash: ev.entryHash,
        entryDate: ev.entry.date ? new Date(`${ev.entry.date}T00:00:00Z`) : null,
        title: ev.entry.title.slice(0, 500),
        text: ev.entry.text,
        previousText: ev.previousText,
        kind: ev.kind,
        status: statusFor(ev.kind, diff.anomaly),
      })),
    });
  }
  const rows = await db.changeEvent.findMany({ where: { snapshotId: opts.snapshotId, status: "NEW" }, select: { id: true }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => r.id);
}
