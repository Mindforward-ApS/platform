import { z } from "zod";
import { httpRequest } from "@/server/http";
import type { ContentConfig } from "./config";
import type { CreateIssue, IssueInput } from "./model";
import type { Classification } from "./prompts/content-classify.v1";

// GitHub issue for UI/CORE changes (docs/06 § 9). Idempotent: the body carries <!-- greb-change-event:{id} -->,
// we search for it before creating, and ChangeEvent.githubIssueUrl is stored by the caller.

export const issueMarker = (changeEventId: string) => `greb-change-event:${changeEventId}`;

export interface IssueContext {
  changeEventId: string;
  title: string;
  track: string;
  entryUrl: string;
  fetchedAt: Date;
  snapshotId: string;
  classification: Classification;
  entryText: string;
  affectedModules: { slug: string; title: string; type: string; version: number | null; featureRefs: string[] }[];
  moduleVersionId: string | null;
  moduleJson: unknown;
}

export function issueLabels(ctx: Pick<IssueContext, "track" | "classification">): string[] {
  const c = ctx.classification;
  const labels = ["content-engine", `track:${ctx.track}`];
  if (c.needsNewSandboxUi) labels.push("needs-sandbox-ui");
  if (c.affectsCore) labels.push("affects-core");
  if (c.changeType === "DEPRECATION" || c.changeType === "RETIREMENT" || c.deprecations.length > 0) labels.push("deprecation");
  return labels;
}

export function buildIssue(ctx: IssueContext): IssueInput {
  const c = ctx.classification;
  const region = c.region.status === "known" ? `${c.region.values.join(", ")} — "${c.region.evidenceQuote ?? ""}"` : "ukendt — UI/tekst skal sige 'tjek tilgængelighed hos jer'";
  const plans = c.plans.status === "known" ? c.plans.values.join(", ") : "ikke oplyst";
  const affected = ctx.affectedModules.length
    ? ctx.affectedModules.map((m) => `- \`${m.slug}\` · ${m.title} · ${m.type} · v${m.version ?? "–"} · featureRefs: ${m.featureRefs.join(", ") || "–"}`).join("\n")
    : "- ingen";
  const tasks = [
    "1. Læs `CLAUDE.md`, `docs/04-sandkasse.md`, `docs/05-moduler-og-scoring.md`.",
    c.needsNewSandboxUi
      ? `2. Byg den mindste generiske sandkasse-komponent der kan øve begrebet '${c.concepts.join(", ")}'. Følg skin-reglerne: kun layout-regioner og generiske menubegreber, ingen logoer/farver/fonte/ikoner fra leverandøren, ingen skærmbilleder. Tilføj sandkasse-events og assertions til CLICK_TASK.`
      : "",
    c.affectsCore ? "3. Opdatér CORE-modulerne ovenfor. Begrebsbaseret pensum: funktionsnavne kommer fra content/features/registry.json, ikke hardkodet i tekst." : "",
    "4. Opdatér `content/features/registry.json` (status/udfasningsdato/afløser) hvis relevant.",
    ctx.moduleVersionId ? `5. Kladde-modul (ModuleVersion \`${ctx.moduleVersionId}\`, status IN_REVIEW) er vedhæftet nedenfor som JSON — brug den som udgangspunkt; alle FACT-claims skal beholde sourceRef.` : "",
    "6. Tests: schema-validering af modulet, Playwright-test af nye CLICK_TASK-trin, ingen visuelle regressioner i eksisterende skins.",
    `7. PR-titel: \`content: ${ctx.title}\`; link dette issue. Publicering sker IKKE ved merge — Marco godkender i /admin/indhold.`,
  ].filter(Boolean);
  const body = [
    `## Indholdsmotor: ${ctx.title}`,
    `<!-- ${issueMarker(ctx.changeEventId)} -->`,
    "",
    `**Spor:** ${ctx.track}${c.requiresTier ? ` · Niveau: ${c.requiresTier}` : ""}`,
    `**Kilde:** ${ctx.entryUrl} (hentet ${ctx.fetchedAt.toISOString()}, snapshot \`${ctx.snapshotId}\`)`,
    `**Type:** ${c.changeType} · Effektiv dato: ${c.effectiveDate ?? "ikke oplyst"}`,
    `**Region:** ${region}`,
    `**Abonnement:** ${plans}`,
    "",
    "### Hvad er ændret (resumé)",
    c.summaryDa,
    "",
    "### Kildetekst (uddrag, til reference — må ikke kopieres ind i produktet)",
    ctx.entryText.slice(0, 1500).split("\n").map((l) => `> ${l}`).join("\n"),
    "",
    "### Berørte moduler",
    affected,
    "",
    "### Opgave til Claude Code",
    ...tasks,
    "",
    "<details><summary>Kladde-JSON</summary>",
    "",
    "```json",
    JSON.stringify(ctx.moduleJson ?? null, null, 2).slice(0, 50_000),
    "```",
    "</details>",
  ].join("\n");
  return { title: `Indholdsmotor: ${ctx.title}`.slice(0, 250), body, labels: issueLabels(ctx), marker: issueMarker(ctx.changeEventId) };
}

const searchResult = z.object({ items: z.array(z.object({ html_url: z.string() })) });
const created = z.object({ html_url: z.string() });

/** Default createIssue: GitHub REST via src/server/http.ts. Search first (idempotent); POST only when absent. */
export function githubCreateIssue(cfg: Pick<ContentConfig, "github">, fetchImpl?: typeof fetch): CreateIssue {
  return async (input) => {
    const { repo, token } = cfg.github;
    if (!repo || !token) throw new Error("GITHUB_REPO/GITHUB_TOKEN not configured");
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "greb-content-engine" };
    const q = encodeURIComponent(`repo:${repo} is:issue in:body "${input.marker}"`);
    const found = await httpRequest(`https://api.github.com/search/issues?q=${q}`, { service: "github", headers, timeoutMs: 15_000, fetchImpl });
    if (found.ok) {
      const hit = searchResult.safeParse(await found.json());
      if (hit.success && hit.data.items[0]) return { url: hit.data.items[0].html_url };
    }
    const res = await httpRequest(`https://api.github.com/repos/${repo}/issues`, {
      service: "github",
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ title: input.title, body: input.body, labels: input.labels }),
      timeoutMs: 15_000,
      fetchImpl,
    });
    if (!res.ok) throw new Error(`GitHub issue create failed: HTTP ${res.status}`);
    return { url: created.parse(await res.json()).html_url };
  };
}
