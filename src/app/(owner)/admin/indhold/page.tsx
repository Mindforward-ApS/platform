import Link from "next/link";
import { Suspense } from "react";
import { Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requirePlatformAdmin } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { loadContentConfig } from "@/server/content-engine/config";
import { AUTOPUBLISH_FLAG, PIPELINE_FLAG } from "@/server/content-engine/flags";
import { loadContentAdmin, type ContentAdminData } from "@/server/content-engine/review";
import { db } from "@/server/db";
import {
  approveVersionAction,
  pasteSourceAction,
  rejectVersionAction,
  rollbackModuleAction,
  runSourceNowAction,
  toggleKillSwitchAction,
  toggleSourceAction,
} from "./actions";

// /admin/indhold — owner review of the content engine (GREB_ADMIN + 2FA). Neutral placeholder layout (tokens only).

const t = () => getMessages().contentEngine.admin;
const MESSAGES = ["approved", "rejected", "conflict", "rolledBack", "unpublished", "saved", "runQueued", "runLimited", "pasted"] as const;
type MessageKey = (typeof MESSAGES)[number];

function messageText(key: MessageKey): { text: string; tone: "info" | "error" } {
  const a = t();
  const map: Record<MessageKey, string> = {
    approved: a.review.approved,
    rejected: a.review.rejected,
    conflict: a.review.conflict,
    rolledBack: a.published.rolledBack,
    unpublished: a.published.unpublished,
    saved: a.switches.saved,
    runQueued: a.sources.runQueued,
    runLimited: a.sources.runLimited,
    pasted: a.sources.pasted,
  };
  return { text: map[key], tone: key === "conflict" || key === "runLimited" ? "error" : "info" };
}

const date = (d: Date | null) => (d ? new Intl.DateTimeFormat("da-DK", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Copenhagen" }).format(d) : t().sources.never);

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-4" data-testid={testId}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Switches({ data }: { data: ContentAdminData }) {
  const a = t().switches;
  const rows = [
    { key: PIPELINE_FLAG, label: a.pipeline, on: data.switches.pipeline },
    { key: AUTOPUBLISH_FLAG, label: a.autopublish, on: data.switches.autopublish },
  ];
  return (
    <Section title={a.title} testId="kill-switches">
      {rows.map((r) => (
        <form key={r.key} action={toggleKillSwitchAction} className="flex items-center justify-between gap-3">
          <span>
            {r.label}: <strong data-testid={`switch-${r.key}`}>{r.on ? a.on : a.off}</strong>
          </span>
          <input type="hidden" name="key" value={r.key} />
          <input type="hidden" name="enabled" value={r.on ? "0" : "1"} />
          <SubmitButton variant="secondary">{r.on ? a.turnOff : a.turnOn}</SubmitButton>
        </form>
      ))}
    </Section>
  );
}

function VerifyReportView({ verify }: { verify: ContentAdminData["queue"][number]["verify"] }) {
  const a = t().review;
  if (!verify) return null;
  return (
    <details className="text-sm">
      <summary>
        {a.verify}: {verify.passed ? a.verifyPassed : a.verifyFailed} ({verify.stage})
      </summary>
      {(verify.schemaErrors.length > 0 || verify.errors.length > 0) && (
        <div className="mt-2">
          <p className="font-semibold">{a.errors}</p>
          <ul className="list-disc pl-5">
            {[...verify.schemaErrors, ...verify.errors.map((e) => `${e.code}: ${e.message}`)].map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {verify.claims.length > 0 && (
        <div className="mt-2">
          <p className="font-semibold">{a.claims}</p>
          <ul className="flex flex-col gap-1">
            {verify.claims.map((c) => (
              <li key={c.id}>
                <span className="font-mono">{c.id}</span> [{c.kind}
                {c.verdict ? ` · ${c.verdict}` : ""}] {c.text}
                {c.quote && <blockquote className="border-l border-border pl-2 text-muted">{c.quote}</blockquote>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {verify.language && (
        <p className="mt-2">
          {a.language}: {verify.language.status} {verify.language.fixes.join(" · ")}
        </p>
      )}
    </details>
  );
}

function Queue({ data }: { data: ContentAdminData }) {
  const a = t().review;
  return (
    <Section title={a.title} testId="review-queue">
      {data.queue.length === 0 && <p className="text-muted">{a.empty}</p>}
      {data.queue.map((item) => (
        <article key={item.versionId} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3" data-testid="review-item">
          <h3 className="font-semibold">
            {item.title} <span className="text-sm text-muted">· {item.slug} · {item.moduleType} · {format(a.version, { version: item.version })}</span>
          </h3>
          {item.reasons.length > 0 && (
            <p className="text-sm">
              {a.reason}: {item.reasons.map((r) => (a.reasons as Record<string, string>)[r] ?? r).join(", ")}
            </p>
          )}
          {item.sourceLinks.length > 0 && (
            <p className="text-sm">
              {a.sources}:{" "}
              {item.sourceLinks.map((u) => (
                <a key={u} href={u} className="underline" rel="noreferrer noopener" target="_blank">
                  {new URL(u).host}
                </a>
              ))}
            </p>
          )}
          {item.issueUrl && (
            <p className="text-sm">
              {a.issue}:{" "}
              <a href={item.issueUrl} className="underline" rel="noreferrer noopener" target="_blank">
                {item.issueUrl}
              </a>
            </p>
          )}
          <VerifyReportView verify={item.verify} />
          <details className="text-sm">
            <summary>{a.diff}</summary>
            {item.diff ? (
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                {item.diff.map((l, i) => (
                  <span key={i} className={l.op === "del" ? "block text-danger line-through" : l.op === "add" ? "block font-semibold" : "block text-muted"}>
                    {l.op === "add" ? "+ " : l.op === "del" ? "- " : "  "}
                    {l.text}
                  </span>
                ))}
              </pre>
            ) : (
              <p className="mt-2 text-muted">{a.diffNone}</p>
            )}
          </details>
          <details className="text-sm">
            <summary>{a.preview}</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {item.previewLines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </details>
          <div className="flex flex-wrap items-end gap-2">
            <form action={approveVersionAction}>
              <input type="hidden" name="versionId" value={item.versionId} />
              <SubmitButton>{a.approve}</SubmitButton>
            </form>
            <form action={rejectVersionAction} className="flex items-end gap-2">
              <input type="hidden" name="versionId" value={item.versionId} />
              <label className="flex flex-col gap-1 text-sm">
                <span>{a.rejectReason}</span>
                <input name="reason" maxLength={500} className="rounded-md border border-border bg-bg px-2 py-1" />
              </label>
              <SubmitButton variant="secondary">{a.reject}</SubmitButton>
            </form>
          </div>
        </article>
      ))}
    </Section>
  );
}

function Published({ data }: { data: ContentAdminData }) {
  const a = t().published;
  return (
    <Section title={a.title} testId="published-modules">
      {data.published.length === 0 && <p className="text-muted">{a.empty}</p>}
      <ul className="flex flex-col gap-2">
        {data.published.map((m) => (
          <li key={m.moduleId} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {m.version.title} <span className="text-sm text-muted">· {m.slug} · v{m.version.version} · {m.version.origin === "AUTO" ? a.auto : a.manual} · {date(m.version.publishedAt)}</span>
            </span>
            <form action={rollbackModuleAction}>
              <input type="hidden" name="moduleId" value={m.moduleId} />
              <SubmitButton variant="secondary">{a.rollback}</SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Sources({ data }: { data: ContentAdminData }) {
  const a = t().sources;
  const sw = t().switches;
  return (
    <Section title={a.title} testId="content-sources">
      <ul className="flex flex-col gap-3">
        {data.sources.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <a href={s.url} className="font-mono underline" rel="noreferrer noopener" target="_blank">
                  {s.key}
                </a>{" "}
                <span className="text-sm text-muted">
                  · {s.track} · {a.status}: {s.status} · {a.lastSuccess}: {date(s.lastSuccessAt)} · {a.enabled}: {s.enabled ? sw.on : sw.off}
                </span>
              </span>
              <span className="flex gap-2">
                <form action={toggleSourceAction}>
                  <input type="hidden" name="sourceId" value={s.id} />
                  <input type="hidden" name="enabled" value={s.enabled ? "0" : "1"} />
                  <SubmitButton variant="secondary">{s.enabled ? sw.turnOff : sw.turnOn}</SubmitButton>
                </form>
                <form action={runSourceNowAction}>
                  <input type="hidden" name="sourceId" value={s.id} />
                  <SubmitButton variant="secondary" disabled={!s.enabled}>
                    {a.runNow}
                  </SubmitButton>
                </form>
              </span>
            </div>
            {s.status !== "ACTIVE" && (
              <details>
                <summary className="text-sm">{a.paste}</summary>
                <form action={pasteSourceAction} className="mt-2 flex flex-col gap-2">
                  <p className="text-sm text-muted">{a.pasteHelp}</p>
                  <input type="hidden" name="sourceId" value={s.id} />
                  <textarea name="text" rows={8} required minLength={20} className="rounded-md border border-border bg-bg p-2 font-mono text-sm" />
                  <SubmitButton variant="secondary">{a.pasteSubmit}</SubmitButton>
                </form>
              </details>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Runs({ data }: { data: ContentAdminData }) {
  const a = t().runs;
  return (
    <Section title={a.title} testId="pipeline-runs">
      {data.runs.length === 0 && <p className="text-muted">{a.empty}</p>}
      <ul className="flex flex-col gap-2 text-sm">
        {data.runs.map((r) => (
          <li key={r.id}>
            <details>
              <summary>
                {date(r.startedAt)} · {r.kind} · {r.source ?? "–"} · {a.status}: {r.status} · {a.tokens}: {r.tokensIn}/{r.tokensOut} · {a.cost}: {r.costDkk.toFixed(2)}
              </summary>
              {r.error && (
                <p className="mt-1 text-danger">
                  {a.error}: {r.error}
                </p>
              )}
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-xs">{JSON.stringify({ steps: r.steps, modelIds: r.modelIds, promptVersions: r.promptVersions }, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ul>
    </Section>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ besked?: string }> }) {
  await guardPage(() => requirePlatformAdmin(), "/admin/indhold");
  const [sp, data] = await Promise.all([searchParams, loadContentAdmin(db(), loadContentConfig())]);
  const msg = MESSAGES.find((m) => m === sp.besked);
  const notice = msg ? messageText(msg) : null;
  return (
    <div className="flex flex-col gap-4" data-testid="content-admin">
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <Switches data={data} />
      <Queue data={data} />
      <Published data={data} />
      <Sources data={data} />
      <Runs data={data} />
    </div>
  );
}

export default function ContentAdminPage(props: PageProps<"/admin/indhold">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-6">
      <Link href="/admin" className="text-sm underline">
        {t().back}
      </Link>
      <h1 className="text-2xl font-semibold">{t().title}</h1>
      <p className="text-muted">{t().intro}</p>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ besked?: string }>} />
      </Suspense>
    </main>
  );
}
