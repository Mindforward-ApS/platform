import { Suspense } from "react";
import { Section } from "@/components/admin/admin-shell";
import { Icon } from "@/components/ui/icons";
import { Badge, EmptyState, Notice, Page, Stat, TextArea, Field, TextLink, cx } from "@/components/ui/primitives";
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

// /admin/indhold — owner review of the content engine (GREB_ADMIN + 2FA).

const t = () => getMessages().contentEngine.admin;
const MESSAGES = ["approved", "rejected", "conflict", "rolledBack", "unpublished", "saved", "runQueued", "runLimited", "pasted"] as const;
type MessageKey = (typeof MESSAGES)[number];

function messageText(key: MessageKey): { text: string; tone: "success" | "error" } {
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
  return { text: map[key], tone: key === "conflict" || key === "runLimited" ? "error" : "success" };
}

const date = (d: Date | null) => (d ? new Intl.DateTimeFormat("da-DK", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Copenhagen" }).format(d) : t().sources.never);

/** Small disclosure used for verify reports, diffs, previews and run details. */
function Disclosure({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="group/d rounded-md border border-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-label text-ink hover:bg-sunken [&::-webkit-details-marker]:hidden">
        <Icon name="chevronRight" className="text-ink-muted transition-transform duration-[120ms] group-open/d:rotate-90" />
        {summary}
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-body-sm text-ink">{children}</div>
    </details>
  );
}

/** Raw engine status values (ACTIVE, FAILED, …) shown as mono badges; success/failure get an icon. */
function RawStatus({ value }: { value: string }) {
  const ok = /^(ACTIVE|SUCCEEDED|SUCCESS|DONE|COMPLETED|PUBLISHED)$/.test(value);
  const bad = /(FAIL|ERROR|BLOCKED)/.test(value);
  return (
    <Badge tone={ok ? "success" : bad ? "danger" : "neutral"} icon={ok ? "check" : bad ? "alert" : undefined} className="font-mono">
      {value}
    </Badge>
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
      <ul className="-mx-6 -my-6 flex flex-col divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key}>
            <form action={toggleKillSwitchAction} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <span className="flex flex-wrap items-center gap-3">
                <span className="text-body text-ink">{r.label}</span>
                <Badge tone={r.on ? "success" : "neutral"} icon={r.on ? "check" : "dash"}>
                  <span data-testid={`switch-${r.key}`}>{r.on ? a.on : a.off}</span>
                </Badge>
              </span>
              <input type="hidden" name="key" value={r.key} />
              <input type="hidden" name="enabled" value={r.on ? "0" : "1"} />
              <SubmitButton variant="secondary">{r.on ? a.turnOff : a.turnOn}</SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function VerifyReportView({ verify }: { verify: ContentAdminData["queue"][number]["verify"] }) {
  const a = t().review;
  if (!verify) return null;
  return (
    <Disclosure
      summary={
        <span className="flex flex-wrap items-center gap-2">
          {a.verify}
          <Badge tone={verify.passed ? "success" : "danger"} icon={verify.passed ? "check" : "x"}>
            {verify.passed ? a.verifyPassed : a.verifyFailed}
          </Badge>
          <span className="font-mono text-mono text-ink-muted">{verify.stage}</span>
        </span>
      }
    >
      {(verify.schemaErrors.length > 0 || verify.errors.length > 0) && (
        <div className="flex flex-col gap-1">
          <p className="text-label text-danger">{a.errors}</p>
          <ul className="list-disc pl-5">
            {[...verify.schemaErrors, ...verify.errors.map((e) => `${e.code}: ${e.message}`)].map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {verify.claims.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-label text-ink">{a.claims}</p>
          <ul className="flex flex-col gap-2">
            {verify.claims.map((c) => (
              <li key={c.id} className="flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-mono text-ink-muted">{c.id}</span>
                  <Badge>{c.kind}</Badge>
                  {c.verdict && <Badge tone={c.verdict === "SUPPORTED" ? "success" : "neutral"}>{c.verdict}</Badge>}
                </span>
                <span>{c.text}</span>
                {c.quote && <blockquote className="rounded-sm bg-sunken px-3 py-2 text-ink-muted">{c.quote}</blockquote>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {verify.language && (
        <p>
          <span className="text-label">{a.language}:</span> <span className="font-mono text-mono">{verify.language.status}</span> {verify.language.fixes.join(" · ")}
        </p>
      )}
    </Disclosure>
  );
}

function Queue({ data }: { data: ContentAdminData }) {
  const a = t().review;
  return (
    <section className="flex flex-col gap-4" data-testid="review-queue">
      <h2 className="flex items-center gap-2 text-title-2 text-ink">
        {a.title}
        <Badge tone={data.queue.length > 0 ? "hint" : "neutral"}>
          <span className="tabular-nums">{data.queue.length}</span>
        </Badge>
      </h2>
      {data.queue.length === 0 && <EmptyState icon="check" title={a.empty} />}
      {data.queue.map((item) => (
        <article key={item.versionId} className="overflow-hidden rounded-lg border border-line bg-surface" data-testid="review-item">
          <header className="flex flex-col gap-2 border-b border-line px-6 py-4">
            <h3 className="text-title-3 text-ink">{item.title}</h3>
            <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
              <span className="font-mono text-mono">{item.slug}</span>
              <span aria-hidden="true">·</span>
              <span>{item.moduleType}</span>
              <span aria-hidden="true">·</span>
              <span>{format(a.version, { version: item.version })}</span>
            </p>
            {item.reasons.length > 0 && (
              <p className="flex flex-wrap items-center gap-2 text-body-sm">
                <span className="text-ink-muted">{a.reason}:</span>
                {item.reasons.map((r) => (
                  <Badge key={r} tone="hint" icon="alert">
                    {(a.reasons as Record<string, string>)[r] ?? r}
                  </Badge>
                ))}
              </p>
            )}
          </header>
          <div className="flex flex-col gap-3 px-6 py-5">
            {(item.sourceLinks.length > 0 || item.issueUrl) && (
              <dl className="grid gap-2 text-body-sm sm:grid-cols-[140px_1fr]">
                {item.sourceLinks.length > 0 && (
                  <>
                    <dt className="text-ink-muted">{a.sources}</dt>
                    <dd className="flex flex-wrap gap-x-3 gap-y-1">
                      {item.sourceLinks.map((u) => (
                        <a key={u} href={u} className="inline-flex items-center gap-1 font-medium text-accent hover:underline" rel="noreferrer noopener" target="_blank">
                          {new URL(u).host}
                          <Icon name="external" size={12} />
                        </a>
                      ))}
                    </dd>
                  </>
                )}
                {item.issueUrl && (
                  <>
                    <dt className="text-ink-muted">{a.issue}</dt>
                    <dd className="min-w-0 break-all">
                      <a href={item.issueUrl} className="font-medium text-accent hover:underline" rel="noreferrer noopener" target="_blank">
                        {item.issueUrl}
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            )}
            <VerifyReportView verify={item.verify} />
            <Disclosure summary={a.diff}>
              {item.diff ? (
                <pre className="-mx-4 -my-3 overflow-x-auto bg-sunken px-4 py-3 font-mono text-mono whitespace-pre-wrap">
                  {item.diff.map((l, i) => (
                    <span key={i} className={cx("block", l.op === "del" ? "text-danger line-through" : l.op === "add" ? "text-success" : "text-ink-muted")}>
                      {l.op === "add" ? "+ " : l.op === "del" ? "- " : "  "}
                      {l.text}
                    </span>
                  ))}
                </pre>
              ) : (
                <p className="text-ink-muted">{a.diffNone}</p>
              )}
            </Disclosure>
            <Disclosure summary={a.preview}>
              <ul className="flex flex-col gap-1.5">
                {item.previewLines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </Disclosure>
          </div>
          <footer className="flex flex-col gap-4 border-t border-line bg-sunken px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
            <form action={rejectVersionAction} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="versionId" value={item.versionId} />
              <div className="sm:max-w-xs sm:flex-1">
                <Field label={a.rejectReason} name="reason" maxLength={500} />
              </div>
              <SubmitButton variant="secondary">{a.reject}</SubmitButton>
            </form>
            <form action={approveVersionAction}>
              <input type="hidden" name="versionId" value={item.versionId} />
              <SubmitButton>{a.approve}</SubmitButton>
            </form>
          </footer>
        </article>
      ))}
    </section>
  );
}

function Published({ data }: { data: ContentAdminData }) {
  const a = t().published;
  return (
    <Section title={a.title} testId="published-modules">
      {data.published.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{a.empty}</p>
      ) : (
        <ul className="-mx-6 -my-6 flex flex-col divide-y divide-line">
          {data.published.map((m) => (
            <li key={m.moduleId} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-body text-ink">{m.version.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
                  <span className="font-mono text-mono">{m.slug}</span>
                  <span className="font-mono text-mono">v{m.version.version}</span>
                  <Badge tone={m.version.origin === "AUTO" ? "accent" : "neutral"}>{m.version.origin === "AUTO" ? a.auto : a.manual}</Badge>
                  <span>{date(m.version.publishedAt)}</span>
                </span>
              </span>
              <form action={rollbackModuleAction}>
                <input type="hidden" name="moduleId" value={m.moduleId} />
                <SubmitButton variant="secondary">{a.rollback}</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Sources({ data }: { data: ContentAdminData }) {
  const a = t().sources;
  const sw = t().switches;
  return (
    <Section title={a.title} testId="content-sources">
      <ul className="-mx-6 -my-6 flex flex-col divide-y divide-line">
        {data.sources.map((s) => (
          <li key={s.id} className="flex flex-col gap-3 px-6 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-1.5">
                <a href={s.url} className="inline-flex items-center gap-1 self-start font-mono text-mono font-medium text-accent hover:underline" rel="noreferrer noopener" target="_blank">
                  {s.key}
                  <Icon name="external" size={12} />
                </a>
                <dl className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-body-sm text-ink-muted">
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">{a.track}</dt>
                    <dd>{s.track}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt>{a.status}</dt>
                    <dd>
                      <RawStatus value={s.status} />
                    </dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt>{a.lastSuccess}</dt>
                    <dd className="text-ink">{date(s.lastSuccessAt)}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt>{a.enabled}</dt>
                    <dd>
                      <Badge tone={s.enabled ? "success" : "neutral"} icon={s.enabled ? "check" : "dash"}>
                        {s.enabled ? sw.on : sw.off}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </div>
              <span className="flex shrink-0 gap-2">
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
              <Disclosure summary={a.paste}>
                <form action={pasteSourceAction} className="flex flex-col gap-3">
                  <input type="hidden" name="sourceId" value={s.id} />
                  <TextArea label={a.paste} help={a.pasteHelp} name="text" rows={8} required minLength={20} className="font-mono text-mono" />
                  <div>
                    <SubmitButton variant="secondary">{a.pasteSubmit}</SubmitButton>
                  </div>
                </form>
              </Disclosure>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Runs({ data }: { data: ContentAdminData }) {
  const a = t().runs;
  const c = t();
  return (
    <Section title={a.title} testId="pipeline-runs">
      {data.runs.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{a.empty}</p>
      ) : (
        <ul className="-mx-6 -my-6 flex flex-col divide-y divide-line">
          {data.runs.map((r) => (
            <li key={r.id}>
              <details className="group/run">
                <summary className="grid cursor-pointer list-none grid-cols-2 items-center gap-x-4 gap-y-1 px-6 py-3 text-body-sm hover:bg-sunken sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto_7rem_6rem_1rem] [&::-webkit-details-marker]:hidden">
                  <span className="text-ink">{date(r.startedAt)}</span>
                  <span className="font-mono text-mono text-ink">{r.kind}</span>
                  <span className="truncate font-mono text-mono text-ink-muted">{r.source ?? "–"}</span>
                  <span>
                    <span className="sr-only">{a.status}: </span>
                    <RawStatus value={r.status} />
                  </span>
                  <span className="text-ink-muted tabular-nums sm:text-right">
                    <span className="sr-only">{a.tokens}: </span>
                    {r.tokensIn}/{r.tokensOut}
                  </span>
                  <span className="text-ink tabular-nums sm:text-right">
                    <span className="sr-only">{a.cost}: </span>
                    {r.costDkk.toFixed(2)}
                  </span>
                  <Icon name="chevronDown" className="hidden text-ink-muted transition-transform duration-[120ms] group-open/run:rotate-180 sm:block" />
                </summary>
                <div className="flex flex-col gap-2 border-t border-line bg-sunken px-6 py-4">
                  {r.error && (
                    <p className="text-body-sm text-danger">
                      {a.error}: {r.error}
                    </p>
                  )}
                  <p className="text-caption text-ink-muted">{c.stepsJson}</p>
                  <pre className="overflow-x-auto rounded-sm border border-line bg-surface p-3 font-mono text-mono whitespace-pre-wrap text-ink">
                    {JSON.stringify({ steps: r.steps, modelIds: r.modelIds, promptVersions: r.promptVersions }, null, 2)}
                  </pre>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ besked?: string }> }) {
  await guardPage(() => requirePlatformAdmin(), "/admin/indhold");
  const [sp, data] = await Promise.all([searchParams, loadContentAdmin(db(), loadContentConfig())]);
  const msg = MESSAGES.find((m) => m === sp.besked);
  const notice = msg ? messageText(msg) : null;
  const s = t().stats;
  return (
    <div className="flex flex-col gap-8" data-testid="content-admin">
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={s.queue} value={data.queue.length} icon="clock" />
        <Stat label={s.published} value={data.published.length} icon="check" />
        <Stat label={s.sources} value={data.sources.filter((x) => x.enabled).length} hint={format(s.sourcesOf, { total: data.sources.length })} icon="route" />
        <Stat label={s.runs} value={data.runs.length} icon="chart" />
      </div>
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
    <Page
      title={t().title}
      lead={t().intro}
      width="app"
      eyebrow={
        <TextLink href="/admin" className="inline-flex items-center gap-1.5 normal-case tracking-normal">
          <Icon name="arrowLeft" />
          {t().back}
        </TextLink>
      }
    >
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ besked?: string }>} />
      </Suspense>
    </Page>
  );
}
