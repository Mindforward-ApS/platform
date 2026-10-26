"use client";

import { useState, type ReactNode } from "react";
import { Badge, Button, Check, cx, EmptyState, Field, Notice, Select, TextArea, type Tone } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { detectPii } from "@/lib/pii";
import type { SandboxState } from "@/server/sandbox/reducer";
import { newOverlayId, streamConnectorDemo } from "./api";
import { SbIcon, type LocalIconName } from "./sandbox-icons";
import type { CalendarItem, CatalogItem, CustomerItem, FileItem, Intent, MailItem, PracticeKind, PracticeView, SheetCellView } from "./types";
import { ConnectorCatalog } from "./connector-catalog";
import { DemoPanel } from "@/components/profile/demo-panel";
import { AppIcon, type IconTone } from "@/components/ui/icons";
import type { ConnectorsLayout } from "@/server/sandbox/skin-schema";
import type { IconName } from "@/components/ui/icons";

// Views for the simulated Nordlys surfaces: a pane header, then list + detail (or a form column).
// Only token classes (src/styles/tokens.css) and Mindforward's own kit — never a vendor's look.

const t = getMessages().sandbox;
type Emit = (intent: Intent) => void;
const nf = new Intl.NumberFormat("da-DK");

/* ───────────────────────── Local layout helpers ───────────────────────── */

export function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-title-3 text-ink">{children}</h2>;
}

/** Top bar of a workspace pane: title, a quiet count and optional tools. */
function PaneHeader({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <Heading>{title}</Heading>
        {meta && <span className="text-caption text-ink-subtle">{meta}</span>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/**
 * List + detail inside a pane. Side by side when the pane is wide enough (container query), otherwise the
 * list, and the detail with a back button once something is open.
 */
function ListDetail({ list, detail, empty, onBack, listWidth = "@3xl:w-[340px]" }: { list: ReactNode; detail: ReactNode | null; empty: ReactNode; onBack: () => void; listWidth?: string }) {
  return (
    <div className="@container flex min-h-0 flex-1">
      <div className="flex min-h-0 flex-1">
        <div className={cx("min-h-0 w-full shrink-0 overflow-y-auto border-line bg-surface @3xl:border-r", listWidth, detail ? "hidden @3xl:block" : "block")}>{list}</div>
        <div className={cx("min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-surface", detail ? "flex" : "hidden @3xl:flex")}>
          {detail ? (
            <>
              <div className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-2 @3xl:hidden">
                <Button type="button" variant="ghost" size="sm" icon="arrowLeft" onClick={onBack}>
                  {t.frame.back}
                </Button>
              </div>
              {detail}
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8">
              <p className="max-w-xs text-center text-body-sm text-ink-subtle">{empty}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** One row in a pane list. */
function ListRow({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        className={cx("flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors sm:px-5", selected ? "bg-accent-soft" : "hover:bg-sunken")}
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  );
}

/** A centered reading column for forms and settings-like views. */
function FormColumn({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto flex w-full max-w-read flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-caption text-ink-muted ring-1 ring-line ring-inset">
      {initials(name)}
    </span>
  );
}

/** Consecutive items with the same day label, in the given order. */
function groupByDay<T>(items: T[], label: (item: T) => string) {
  const days: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const l = label(item);
    const last = days[days.length - 1];
    if (last && last.label === l) last.items.push(item);
    else days.push({ label: l, items: [item] });
  }
  return days;
}

function DayHeading({ children }: { children: ReactNode }) {
  return <h3 className="sticky top-0 z-[1] border-b border-line bg-sunken px-4 py-1.5 text-caption text-ink-muted first-letter:uppercase sm:px-5">{children}</h3>;
}

const fileIcon = (kind: FileItem["kind"]): LocalIconName | IconName => (kind === "doc" ? "file" : "table");

/* ───────────────────────── Mail ───────────────────────── */

export function MailView({ mail, emit }: { mail: MailItem[]; emit: Emit }) {
  const [open, setOpen] = useState<MailItem | null>(null);
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sandbox-mail">
      <PaneHeader title={t.mail.inbox} meta={format(t.mail.count, { n: mail.length })} />
      <ListDetail
        onBack={() => setOpen(null)}
        empty={t.mail.select}
        list={
          <div className="flex flex-col">
            {groupByDay(mail, (m) => m.dateLabel).map((d) => (
              <section key={d.label} aria-label={d.label}>
                <DayHeading>{d.label}</DayHeading>
                <ul>
                  {d.items.map((m) => (
                    <ListRow
                      key={m.id}
                      selected={open?.id === m.id}
                      onClick={() => {
                        setOpen(m);
                        emit({ event: { type: "MAIL_OPENED", payload: { mailId: m.id } } });
                      }}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-label text-ink">{m.fromName}</span>
                        <span className="shrink-0 text-caption text-ink-subtle">{m.time}</span>
                      </span>
                      <span className="truncate text-body-sm text-ink">{m.subject}</span>
                      <span className="line-clamp-1 text-body-sm text-ink-subtle">{m.body.replace(/\s+/g, " ")}</span>
                    </ListRow>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        }
        detail={
          open && (
            <article className="mx-auto flex w-full max-w-read flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
              <h3 className="text-title-2 text-ink">{open.subject}</h3>
              <div className="flex items-start gap-3 border-b border-line pb-5">
                <Avatar name={open.fromName} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-body-sm">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-label text-ink">{open.fromName}</span>
                    <span className="truncate text-ink-subtle">&lt;{open.fromEmail}&gt;</span>
                  </p>
                  <p className="text-ink-muted">
                    {t.mail.to}: {open.to.join(", ")}
                  </p>
                  <p className="text-caption text-ink-subtle">
                    {open.dateLabel} {open.time}
                  </p>
                </div>
              </div>
              <p className="text-body leading-relaxed whitespace-pre-wrap text-ink">{open.body}</p>
              {open.attachments.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-line pt-5">
                  <p className="text-overline text-ink-subtle uppercase">{t.mail.attachments}</p>
                  <ul className="flex flex-wrap gap-2">
                    {open.attachments.map((a) => (
                      <li key={a} className="inline-flex h-8 items-center gap-2 rounded-sm border border-line bg-sunken px-3 text-body-sm text-ink">
                        <SbIcon name="paperclip" className="text-ink-subtle" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          )
        }
      />
    </div>
  );
}

/* ───────────────────────── Calendar ───────────────────────── */

export function CalendarView({ calendar, emit }: { calendar: CalendarItem[]; emit: Emit }) {
  const [open, setOpen] = useState<string | null>(null);
  const days = groupByDay(calendar, (c) => (c.dayOffset === 0 ? `${t.calendar.today} · ${c.dateLabel}` : c.dateLabel));
  const sel = calendar.find((c) => c.id === open) ?? null;
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sandbox-calendar">
      <PaneHeader title={t.calendar.heading} meta={format(t.calendar.count, { n: calendar.length })} />
      <ListDetail
        onBack={() => setOpen(null)}
        empty={t.calendar.select}
        list={
          <div className="flex flex-col">
            {days.map((d) => (
              <section key={d.label} aria-label={d.label}>
                <DayHeading>{d.label}</DayHeading>
                <ul>
                  {d.items.map((c) => (
                    <ListRow
                      key={c.id}
                      selected={open === c.id}
                      onClick={() => {
                        setOpen(c.id);
                        emit({ event: { type: "CALENDAR_EVENT_OPENED", payload: { eventId: c.id } } });
                      }}
                    >
                      <span className="flex items-baseline gap-4">
                        <span className="w-24 shrink-0 text-body-sm text-ink-muted">
                          {c.start}–{c.end}
                        </span>
                        <span className="min-w-0 truncate text-label text-ink">{c.title}</span>
                      </span>
                    </ListRow>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        }
        detail={
          sel && (
            <article className="mx-auto flex w-full max-w-read flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-col gap-2">
                <p className="text-overline text-ink-subtle uppercase">{sel.dayOffset === 0 ? t.calendar.today : sel.dateLabel}</p>
                <h3 className="text-title-2 text-ink">{sel.title}</h3>
              </div>
              <dl className="divide-y divide-line rounded-lg border border-line">
                <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
                  <dt className="text-body-sm text-ink-muted">{t.calendar.time}</dt>
                  <dd className="text-body text-ink">
                    {sel.dateLabel} · {sel.start}–{sel.end}
                  </dd>
                </div>
                <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
                  <dt className="text-body-sm text-ink-muted">{t.calendar.attendees}</dt>
                  <dd className="text-body text-ink">{sel.attendees.join(", ")}</dd>
                </div>
                {sel.note && (
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
                    <dt className="text-body-sm text-ink-muted">{t.calendar.note}</dt>
                    <dd className="text-body text-ink">{sel.note}</dd>
                  </div>
                )}
              </dl>
            </article>
          )
        }
      />
    </div>
  );
}

/* ───────────────────────── Files ───────────────────────── */

export function FilesView({ files, emit, onOpenSheet }: { files: FileItem[]; emit: Emit; onOpenSheet: () => void }) {
  const [open, setOpen] = useState<FileItem | null>(null);
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sandbox-files">
      <PaneHeader title={t.files.heading} meta={format(t.files.count, { n: files.length })} />
      <ListDetail
        onBack={() => setOpen(null)}
        empty={t.files.select}
        listWidth="@3xl:w-[360px]"
        list={
          <ul>
            {files.map((f) => (
              <ListRow
                key={f.id}
                selected={open?.id === f.id}
                onClick={() => {
                  if (f.kind === "sheet") return onOpenSheet();
                  setOpen(f);
                  emit({ event: { type: "FILE_OPENED", payload: { fileId: f.id } } });
                }}
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-sm bg-sunken text-ink-muted ring-1 ring-line ring-inset">
                    <SbIcon name={fileIcon(f.kind)} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-label text-ink">{f.name}</span>
                      {f.confidential && (
                        <Badge tone="hint" icon="lock">
                          {t.files.confidential}
                        </Badge>
                      )}
                    </span>
                    <span className="line-clamp-2 text-body-sm text-ink-subtle">
                      {t.files.kinds[f.kind]} · {f.summary}
                    </span>
                  </span>
                </span>
              </ListRow>
            ))}
          </ul>
        }
        detail={
          open && (
            <article className="mx-auto flex w-full max-w-read flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-overline text-ink-subtle uppercase">
                  <SbIcon name={fileIcon(open.kind)} size={14} />
                  {t.files.kinds[open.kind]}
                  {open.confidential && (
                    <Badge tone="hint" icon="lock">
                      {t.files.confidential}
                    </Badge>
                  )}
                </p>
                <h3 className="text-title-2 break-words text-ink">{open.name}</h3>
                <p className="text-body-sm text-ink-muted">{open.summary}</p>
              </div>
              <pre
                className={cx(
                  "overflow-x-auto rounded-lg border border-line p-5",
                  open.kind === "table" ? "bg-sunken font-mono text-mono whitespace-pre text-ink" : "bg-surface font-sans text-body leading-relaxed whitespace-pre-wrap text-ink",
                )}
              >
                {open.body}
              </pre>
            </article>
          )
        }
      />
    </div>
  );
}

/* ───────────────────────── CRM ───────────────────────── */

const statusTone: Record<CustomerItem["status"], Tone> = { ACTIVE: "success", LEAD: "accent", TRIAL: "hint", CANCELED: "neutral" };

function ToolbarSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <span className="relative">
      <select
        aria-label={label}
        className="h-8 appearance-none rounded-sm border border-line-strong bg-surface pr-8 pl-3 text-body-sm text-ink shadow-xs focus:border-accent focus:shadow-ring focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <SbIcon name="chevronDown" size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-muted" />
    </span>
  );
}

export function CrmView({ crm, emit }: { crm: CustomerItem[]; emit: Emit }) {
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const rows = crm.filter((k) => (!segment || k.segment === segment) && (!status || k.status === status));
  const apply = (seg: string, st: string) => {
    const resultCount = crm.filter((k) => (!seg || k.segment === seg) && (!st || k.status === st)).length;
    emit({ event: { type: "CRM_FILTER_APPLIED", payload: { filter: { ...(seg ? { segment: seg } : {}), ...(st ? { status: st } : {}) }, resultCount } } });
  };
  const sel = crm.find((k) => k.id === open) ?? null;
  const select = (id: string) => {
    setOpen(id);
    emit({ event: { type: "CRM_RECORD_OPENED", payload: { customerId: id } } });
  };
  const cols = [t.crm.name, t.crm.industry, t.crm.city, t.crm.segment, t.crm.status, t.crm.revenue, t.crm.contact, t.crm.nps];

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sandbox-crm">
      <PaneHeader title={t.crm.heading} meta={format(t.crm.count, { n: rows.length })}>
        <ToolbarSelect
          label={t.crm.segment}
          value={segment}
          onChange={(v) => {
            setSegment(v);
            apply(v, status);
          }}
        >
          <option value="">{t.crm.allSegments}</option>
          {["A", "B", "C"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect
          label={t.crm.status}
          value={status}
          onChange={(v) => {
            setStatus(v);
            apply(segment, v);
          }}
        >
          <option value="">{t.crm.allStatuses}</option>
          {(Object.keys(t.crm.statuses) as (keyof typeof t.crm.statuses)[]).map((s) => (
            <option key={s} value={s}>
              {t.crm.statuses[s]}
            </option>
          ))}
        </ToolbarSelect>
      </PaneHeader>
      <div className="@container flex min-h-0 flex-1">
        <div className={cx("min-h-0 min-w-0 flex-1 overflow-auto bg-surface", sel ? "hidden @5xl:block" : "block")}>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-body-sm text-ink-subtle">{t.crm.none}</p>
          ) : (
            <table className="w-full min-w-[880px] border-collapse text-left text-body-sm">
              <thead className="sticky top-0 z-[1]">
                <tr>
                  {cols.map((h, i) => (
                    <th key={h} scope="col" className={cx("border-b border-line bg-sunken px-4 py-2.5 text-caption font-semibold whitespace-nowrap text-ink-muted", (i === 5 || i === 7) && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => (
                  <tr key={k.id} className={cx("border-b border-line transition-colors", open === k.id ? "bg-accent-soft" : "hover:bg-sunken/60")}>
                    <td className="px-4 py-2.5">
                      <button type="button" className="text-left text-label whitespace-nowrap text-ink hover:text-accent" aria-current={open === k.id ? "true" : undefined} onClick={() => select(k.id)}>
                        {k.name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{k.industry}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{k.city}</td>
                    <td className="px-4 py-2.5 text-ink">{k.segment ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={statusTone[k.status]}>{t.crm.statuses[k.status]}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right text-ink">{nf.format(k.annualRevenueDkk)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-muted">{k.contact}</td>
                    <td className="px-4 py-2.5 text-right text-ink">{k.nps ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {sel && (
          <aside aria-label={sel.name} className="flex min-h-0 w-full min-w-0 flex-col overflow-y-auto border-line bg-surface @5xl:w-[320px] @5xl:shrink-0 @5xl:border-l">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
              <span className="@5xl:hidden">
                <Button type="button" variant="ghost" size="sm" icon="arrowLeft" onClick={() => setOpen(null)}>
                  {t.frame.back}
                </Button>
              </span>
              <span className="ml-auto hidden @5xl:block">
                <Button type="button" variant="ghost" size="sm" aria-label={t.frame.back} onClick={() => setOpen(null)}>
                  <SbIcon name="x" />
                </Button>
              </span>
            </div>
            <div className="mx-auto flex w-full max-w-read flex-col gap-5 p-5">
              <div className="flex items-start gap-3">
                <Avatar name={sel.name} />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-title-3 text-ink">{sel.name}</h3>
                  <Badge tone={statusTone[sel.status]} className="self-start">
                    {t.crm.statuses[sel.status]}
                  </Badge>
                </div>
              </div>
              <dl className="divide-y divide-line border-y border-line">
                {(
                  [
                    [t.crm.industry, sel.industry],
                    [t.crm.city, sel.city],
                    [t.crm.segment, sel.segment ?? "—"],
                    [t.crm.revenue, nf.format(sel.annualRevenueDkk)],
                    [t.crm.contact, sel.contact],
                    [t.crm.nps, sel.nps ?? "—"],
                  ] as [string, ReactNode][]
                ).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-body-sm text-ink-muted">{k}</dt>
                    <dd className="text-right text-body-sm text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Sheet ───────────────────────── */

export function SheetView({ cells }: { cells: Record<string, SheetCellView> }) {
  const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const rows = Array.from(new Set(Object.keys(cells).map((c) => Number(c.slice(1))))).sort((a, b) => a - b);
  const [selected, setSelected] = useState<string | null>(null);
  const sel = selected ? cells[selected] : undefined;
  const show = (v: SheetCellView["value"] | undefined) => (typeof v === "number" ? nf.format(v) : v);
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sandbox-sheet">
      <PaneHeader title={t.sheet.heading} />
      {/* Cell bar: reference · value or formula · note. */}
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-surface px-4 py-2 text-body-sm sm:px-6" aria-live="polite">
        <span className="inline-flex h-7 min-w-14 items-center justify-center rounded-xs border border-line bg-sunken px-2 font-mono text-mono text-ink" aria-label={t.sheet.cell}>
          {selected ?? "—"}
        </span>
        {selected && sel ? (
          <>
            <span className="min-w-0 truncate text-ink">
              <span className="text-ink-muted">{sel.formula ? t.sheet.formula : t.sheet.value}: </span>
              <span className={sel.formula ? "font-mono text-mono" : ""}>{sel.formula ?? show(sel.value)}</span>
            </span>
            {sel.note && (
              <span className="min-w-0 text-ink-muted">
                {t.sheet.note}: {sel.note}
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-subtle">{t.sheet.select}</span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-surface">
        <table className="border-separate border-spacing-0 text-body-sm">
          <thead className="sticky top-0 z-[2]">
            <tr>
              <th className="sticky left-0 z-[3] w-10 border-r border-b border-line bg-sunken" aria-hidden="true" />
              {cols.map((c) => (
                <th key={c} scope="col" className="border-r border-b border-line bg-sunken px-3 py-1.5 text-center text-caption font-semibold text-ink-muted">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <th scope="row" className="sticky left-0 z-[1] w-10 border-r border-b border-line bg-sunken px-2 text-center text-caption font-semibold text-ink-muted">
                  {r}
                </th>
                {cols.map((c) => {
                  const ref = `${c}${r}`;
                  const cell = cells[ref];
                  const isSel = selected === ref;
                  const header = r === 1;
                  return (
                    <td key={c} className={cx("border-r border-b border-line p-0", c === "A" ? "min-w-48" : "min-w-28")}>
                      <button
                        type="button"
                        aria-label={ref}
                        aria-pressed={isSel}
                        className={cx(
                          "flex h-9 w-full items-center px-3 whitespace-nowrap",
                          c === "A" ? "justify-start" : "justify-end",
                          header ? "font-semibold text-ink" : "text-ink",
                          isSel ? "bg-accent-soft outline-2 -outline-offset-2 outline-accent" : "hover:bg-sunken/60",
                          cell?.note && "underline decoration-hint decoration-dotted underline-offset-4",
                        )}
                        onClick={() => setSelected(ref)}
                      >
                        {show(cell?.value)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────── Connectors ───────────────────────── */

const KIND_ICON: Record<PracticeKind, { icon: IconName; tone: IconTone }> = {
  office: { icon: "mail", tone: "blue" },
  files: { icon: "file", tone: "sky" },
  chat: { icon: "chats", tone: "sky" },
  projects: { icon: "plan", tone: "mint" },
  crm: { icon: "users", tone: "blue" },
  shop: { icon: "grid", tone: "amber" },
  payments: { icon: "card", tone: "mint" },
  design: { icon: "sparkle", tone: "coral" },
  accounting: { icon: "chart", tone: "amber" },
  jobs: { icon: "building", tone: "coral" },
  automation: { icon: "lightning", tone: "ink" },
};

/** "Til jeres branche": the industry's connectors under neutral names; the layout follows the skin (grid, list, panel). */
export function PracticeConnectors({ practice, layout, sessionId }: { practice: PracticeView | null; layout: ConnectorsLayout; sessionId: string }) {
  const p = t.practice;
  const [open, setOpen] = useState<PracticeKind | null>(null);
  const [tried, setTried] = useState<PracticeKind[]>([]);
  if (!practice) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong/50 bg-surface p-5" data-testid="practice-empty">
        <p className="text-label text-ink">{p.noProfileTitle}</p>
        <p className="text-body-sm text-ink-muted">{p.noProfileBody}</p>
        <a href="/profil/virksomhed" className="text-body-sm font-medium text-accent underline decoration-accent/30 underline-offset-[3px]">
          {p.noProfileCta}
        </a>
      </section>
    );
  }
  const openItem = practice.items.find((i) => i.kind === open);
  const action = (kind: PracticeKind, hasDemo: boolean) =>
    !hasDemo ? null : practice.canDemo ? (
      <Button type="button" size="sm" variant={tried.includes(kind) ? "secondary" : "primary"} icon={tried.includes(kind) ? "check" : "sparkle"} onClick={() => setOpen(open === kind ? null : kind)} aria-expanded={open === kind}>
        {tried.includes(kind) ? p.connected : p.tryIt}
      </Button>
    ) : (
      <Badge icon="lock">{p.locked}</Badge>
    );
  const panel = openItem?.demo ? (
    <DemoPanel
      demo={{ demoId: openItem.demo.id, title: openItem.demo.title, prompt: openItem.demo.prompt, data: openItem.demo.data }}
      stream={(prompt, onDelta) => streamConnectorDemo(sessionId, { demoId: openItem.demo!.id, prompt, kind: openItem.kind }, onDelta).then((r) => (r === null && setTried((x) => (x.includes(openItem.kind) ? x : [...x, openItem.kind])), r))}
      sourceUrl={null}
      t={p.demo}
      onClose={() => setOpen(null)}
    />
  ) : null;

  return (
    <section className="flex flex-col gap-4" data-testid="practice-connectors" data-layout={layout}>
      <div className="flex flex-col gap-1">
        <p className="text-title-3 text-ink">{p.heading}</p>
        <p className="text-body-sm text-ink-muted">{format(p.lead, { industry: practice.industry.toLocaleLowerCase("da") })}</p>
      </div>
      {layout === "GRID" && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {practice.items.map((i) => (
            <li key={i.kind} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <AppIcon name={KIND_ICON[i.kind].icon} tone={KIND_ICON[i.kind].tone} size="md" />
                <span className="text-label text-ink">{p.kinds[i.kind]}</span>
              </div>
              {i.useCase && <p className="line-clamp-3 text-body-sm text-ink-muted">{i.useCase}</p>}
              <div className="mt-auto">{action(i.kind, Boolean(i.demo))}</div>
            </li>
          ))}
        </ul>
      )}
      {layout === "LIST" && (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {practice.items.map((i) => (
            <li key={i.kind} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <AppIcon name={KIND_ICON[i.kind].icon} tone={KIND_ICON[i.kind].tone} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-label text-ink">{p.kinds[i.kind]}</span>
                {i.useCase && <span className="text-body-sm text-ink-muted">{i.useCase}</span>}
              </div>
              {action(i.kind, Boolean(i.demo))}
            </li>
          ))}
        </ul>
      )}
      {layout === "PANEL" && (
        <ul className="flex flex-col gap-1.5">
          {practice.items.map((i) => (
            <li key={i.kind}>
              <details className="group rounded-md border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
                  <AppIcon name={KIND_ICON[i.kind].icon} tone={KIND_ICON[i.kind].tone} size="xs" />
                  <span className="flex-1 text-body-sm text-ink">{p.kinds[i.kind]}</span>
                  <SbIcon name="chevronRight" className="text-ink-subtle transition-transform group-open:rotate-90" />
                </summary>
                <div className="flex flex-col items-start gap-3 border-t border-line px-3 py-3">
                  {i.useCase && <p className="text-body-sm text-ink-muted">{i.useCase}</p>}
                  {action(i.kind, Boolean(i.demo))}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      {panel}
    </section>
  );
}

export function ConnectorsView({ state, emit, practice = null, layout = "LIST", sessionId, catalog }: { state: SandboxState; emit: Emit; practice?: PracticeView | null; layout?: ConnectorsLayout; sessionId: string; catalog: CatalogItem[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sandbox-connectors">
      <PaneHeader title={t.connectors.heading} />
      <FormColumn>
        <ConnectorCatalog catalog={catalog} state={state} emit={emit} />
        <div className="border-t border-line pt-6">
          <PracticeConnectors practice={practice} layout={layout} sessionId={sessionId} />
        </div>
      </FormColumn>
    </div>
  );
}

/* ───────────────────────── Assistants ───────────────────────── */

function TextGate({ text }: { text: string }) {
  const r = detectPii(text);
  const kind = r.findings.find((f) => f.severity === "BLOCK")?.kind;
  return kind ? <Notice tone="danger">{t.pii.blocked[kind]}</Notice> : null;
}

export function AssistantsView({ state, files, emit, title = t.assistants.heading }: { state: SandboxState; files: FileItem[]; emit: Emit; title?: string }) {
  const [instructions, setInstructions] = useState("");
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const blocked = detectPii(instructions).action === "BLOCK";
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sandbox-assistants">
      <PaneHeader title={title} meta={state.assistants.length > 0 ? String(state.assistants.length) : undefined} />
      <FormColumn>
        <p className="text-body text-ink-muted">{t.assistants.intro}</p>
        {state.assistants.length === 0 ? (
          <EmptyState icon="user" title={t.assistants.none} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {state.assistants.map((a, i) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <SbIcon name="assistant" className="text-ink-subtle" />
                <span className="text-label text-ink">{format(t.assistants.created, { n: i + 1 })}</span>
                {a.knowledgeFileIds.length > 0 && <span className="truncate text-body-sm text-ink-subtle">{a.knowledgeFileIds.join(", ")}</span>}
              </li>
            ))}
          </ul>
        )}
        <section className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="border-b border-line px-6 py-4">
            <h3 className="text-title-3 text-ink">{t.terms.newAssistant}</h3>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <TextArea label={t.assistants.instructions} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={8000} className="min-h-32" />
            <TextGate text={instructions} />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-label text-ink">{t.assistants.knowledge}</legend>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {files
                  .filter((f) => f.kind !== "sheet")
                  .map((f) => (
                    <Check
                      key={f.id}
                      label={<span className="text-body-sm">{f.name}</span>}
                      checked={knowledge.includes(f.id)}
                      onChange={(e) => setKnowledge((k) => (e.target.checked ? [...k, f.id] : k.filter((x) => x !== f.id)))}
                    />
                  ))}
              </div>
            </fieldset>
          </div>
          <div className="flex justify-end border-t border-line bg-sunken px-6 py-4">
            <Button
              type="button"
              disabled={!instructions.trim() || blocked}
              onClick={() => {
                emit({
                  event: { type: "ASSISTANT_CREATED", payload: { assistantId: newOverlayId("asst"), instructionCharCount: instructions.length, knowledgeFileIds: knowledge, connectorIds: [], starterCount: 0 } },
                  contentText: instructions,
                });
                setInstructions("");
                setKnowledge([]);
              }}
            >
              {t.assistants.create}
            </Button>
          </div>
        </section>
      </FormColumn>
    </div>
  );
}

/* ───────────────────────── Automations ───────────────────────── */

export function AutomationsView({ state, emit, title = t.automations.heading }: { state: SandboxState; emit: Emit; title?: string }) {
  const [prompt, setPrompt] = useState("");
  const [weekday, setWeekday] = useState(5);
  const [time, setTime] = useState("08:00");
  const blocked = detectPii(prompt).action === "BLOCK";
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="sandbox-automations">
      <PaneHeader title={title} meta={state.automations.length > 0 ? String(state.automations.length) : undefined} />
      <FormColumn>
        <p className="text-body text-ink-muted">{t.automations.intro}</p>
        {state.automations.length === 0 ? (
          <EmptyState icon="clock" title={t.automations.none} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {state.automations.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-label text-ink">{format(t.automations.item, { n: i + 1 })}</span>
                  <span className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
                    {a.enabled ? (
                      <Badge tone="success" icon="check">
                        {t.automations.enabled}
                      </Badge>
                    ) : (
                      <Badge>{t.automations.disabled}</Badge>
                    )}
                    <span>{format(t.automations.testRuns, { n: a.testRuns })}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => emit({ event: { type: a.enabled ? "AUTOMATION_DISABLED" : "AUTOMATION_ENABLED", payload: { automationId: a.id } } })}>
                    {a.enabled ? t.automations.disable : t.automations.enable}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => emit({ event: { type: "AUTOMATION_TEST_RUN", payload: { automationId: a.id, success: true, actionsRun: a.actionTypes.length } } })}
                  >
                    {t.automations.testRun}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <section className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="border-b border-line px-6 py-4">
            <h3 className="text-title-3 text-ink">{t.automations.create}</h3>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <TextArea label={t.automations.prompt} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={8000} />
            <TextGate text={prompt} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label={t.automations.weekday} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {t.automations.weekdays.map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </Select>
              <Field label={t.automations.time} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end border-t border-line bg-sunken px-6 py-4">
            <Button
              type="button"
              disabled={!prompt.trim() || blocked || !/^\d{2}:\d{2}$/.test(time)}
              onClick={() => {
                emit({
                  event: {
                    type: "AUTOMATION_CREATED",
                    payload: {
                      automationId: newOverlayId("auto"),
                      trigger: { type: "SCHEDULE", freq: "WEEKLY", weekday, time },
                      actions: [
                        { type: "RUN_PROMPT", connectorIds: [] },
                        { type: "NOTIFY_ME", connectorIds: [] },
                      ],
                      promptCharCount: prompt.length,
                    },
                  },
                  contentText: prompt,
                });
                setPrompt("");
              }}
            >
              {t.automations.create}
            </Button>
          </div>
        </section>
      </FormColumn>
    </div>
  );
}

/* ───────────────────────── Stub ───────────────────────── */

export function StubView({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PaneHeader title={heading} />
      <FormColumn>
        <EmptyState icon="sparkle" title={heading}>
          {body}
        </EmptyState>
      </FormColumn>
    </div>
  );
}
