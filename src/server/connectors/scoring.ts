// Connector recommendations: deterministic, data-driven scoring (no LLM at runtime).
// score = Σ(task weight × connector covers the task) + bonus per system the user said they use.
// A connector is only recommended when its availability on the platform is OFFICIAL or THIRD_PARTY *and*
// documented (source URL + verification date). Everything else goes under "not available on <platform> yet".

export type ConnectorPlatformKey = "CLAUDE" | "CHATGPT" | "COPILOT";
export type AvailabilityStatusKey = "OFFICIAL" | "THIRD_PARTY" | "NONE" | "UNVERIFIED";

export interface Availability {
  status: AvailabilityStatusKey;
  sourceUrl: string | null;
  lastVerifiedAt: Date | null;
}

export interface ScoringConnector {
  id: string;
  name: string;
  taskIds: readonly string[];
  systemIds: readonly string[];
  availability: Partial<Record<ConnectorPlatformKey, Availability>>;
}

export interface ScoredConnector {
  id: string;
  name: string;
  score: number;
  status: AvailabilityStatusKey;
  sourceUrl: string | null;
  coveredTaskIds: string[];
  matchedSystemIds: string[];
}

export const SYSTEM_BONUS = 3;

const STATUS_RANK: Record<AvailabilityStatusKey, number> = { OFFICIAL: 0, THIRD_PARTY: 1, UNVERIFIED: 2, NONE: 3 };

export function isVerified(a: Availability | undefined): boolean {
  return Boolean(a && (a.status === "OFFICIAL" || a.status === "THIRD_PARTY") && a.sourceUrl && a.lastVerifiedAt);
}

export function scoreConnectors(input: {
  tasks: readonly { taskId: string; weight: number }[];
  connectors: readonly ScoringConnector[];
  selectedSystemIds: readonly string[];
  platform: ConnectorPlatformKey;
}): { recommended: ScoredConnector[]; unavailable: ScoredConnector[] } {
  const weights = new Map(input.tasks.map((t) => [t.taskId, t.weight]));
  const selected = new Set(input.selectedSystemIds);
  const recommended: ScoredConnector[] = [];
  const unavailable: ScoredConnector[] = [];

  for (const c of input.connectors) {
    const coveredTaskIds = c.taskIds.filter((t) => weights.has(t));
    const matchedSystemIds = c.systemIds.filter((s) => selected.has(s));
    const score = coveredTaskIds.reduce((sum, t) => sum + (weights.get(t) ?? 0), 0) + matchedSystemIds.length * SYSTEM_BONUS;
    if (score <= 0) continue; // irrelevant for this industry and these systems
    const a = c.availability[input.platform];
    const scored: ScoredConnector = { id: c.id, name: c.name, score, status: a?.status ?? "UNVERIFIED", sourceUrl: a?.sourceUrl ?? null, coveredTaskIds, matchedSystemIds };
    if (isVerified(a)) recommended.push(scored);
    else unavailable.push({ ...scored, status: a && a.status === "NONE" ? "NONE" : "UNVERIFIED" });
  }

  const byScore = (x: ScoredConnector, y: ScoredConnector) => y.score - x.score || x.name.localeCompare(y.name, "da");
  recommended.sort((x, y) => STATUS_RANK[x.status] - STATUS_RANK[y.status] || byScore(x, y));
  unavailable.sort(byScore);
  return { recommended, unavailable };
}
