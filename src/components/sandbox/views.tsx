"use client";

import { useState } from "react";
import { format, getMessages } from "@/lib/i18n";
import { detectPii } from "@/lib/pii";
import type { ConnectorId, Scope } from "@/server/sandbox/events";
import type { SandboxState } from "@/server/sandbox/reducer";
import { newOverlayId } from "./api";
import type { CalendarItem, CustomerItem, FileItem, Intent, MailItem, SheetCellView } from "./types";

// Neutral placeholder views for the simulated Nordlys surfaces. Only token classes (src/styles/tokens.css).

const t = getMessages().sandbox;
type Emit = (intent: Intent) => void;

const listButton = "w-full rounded-md border border-border p-2 text-left";
const primary = "rounded-md bg-accent px-3 py-2 text-accent-fg";
const secondary = "rounded-md border border-border bg-surface px-3 py-2";

export function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function MailView({ mail, emit }: { mail: MailItem[]; emit: Emit }) {
  const [open, setOpen] = useState<MailItem | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="sandbox-mail">
      <div className="flex flex-col gap-2">
        <Heading>{t.mail.inbox}</Heading>
        <ul className="flex flex-col gap-1">
          {mail.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`${listButton} ${open?.id === m.id ? "bg-surface" : ""}`}
                onClick={() => {
                  setOpen(m);
                  emit({ event: { type: "MAIL_OPENED", payload: { mailId: m.id } } });
                }}
              >
                <span className="block text-sm text-muted">
                  {m.fromName} · {m.dateLabel} {m.time}
                </span>
                <span className="block">{m.subject}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <article className="flex flex-col gap-2">
        {open ? (
          <>
            <Heading>{open.subject}</Heading>
            <p className="text-sm text-muted">
              {t.mail.from}: {open.fromName} &lt;{open.fromEmail}&gt; · {t.mail.to}: {open.to.join(", ")}
            </p>
            <p className="whitespace-pre-wrap">{open.body}</p>
            {open.attachments.length > 0 && (
              <p className="text-sm">
                {t.mail.attachments}: {open.attachments.join(", ")}
              </p>
            )}
          </>
        ) : (
          <p className="text-muted">{t.mail.select}</p>
        )}
      </article>
    </div>
  );
}

export function CalendarView({ calendar, emit }: { calendar: CalendarItem[]; emit: Emit }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2" data-testid="sandbox-calendar">
      <Heading>{t.calendar.heading}</Heading>
      <ul className="flex flex-col gap-1">
        {calendar.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={listButton}
              onClick={() => {
                setOpen(open === c.id ? null : c.id);
                emit({ event: { type: "CALENDAR_EVENT_OPENED", payload: { eventId: c.id } } });
              }}
            >
              <span className="block text-sm text-muted">
                {c.dayOffset === 0 ? t.calendar.today : c.dateLabel} · {c.start}–{c.end}
              </span>
              <span className="block">{c.title}</span>
              {open === c.id && (
                <span className="block text-sm">
                  {t.calendar.attendees}: {c.attendees.join(", ")}
                  {c.note ? ` · ${c.note}` : ""}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FilesView({ files, emit, onOpenSheet }: { files: FileItem[]; emit: Emit; onOpenSheet: () => void }) {
  const [open, setOpen] = useState<FileItem | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="sandbox-files">
      <div className="flex flex-col gap-2">
        <Heading>{t.files.heading}</Heading>
        <ul className="flex flex-col gap-1">
          {files.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={listButton}
                onClick={() => {
                  if (f.kind === "sheet") return onOpenSheet();
                  setOpen(f);
                  emit({ event: { type: "FILE_OPENED", payload: { fileId: f.id } } });
                }}
              >
                <span className="block">{f.name}</span>
                <span className="block text-sm text-muted">
                  {f.summary}
                  {f.confidential ? ` · ${t.files.confidential}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <article className="flex min-w-0 flex-col gap-2">
        {open ? (
          <>
            <Heading>{open.name}</Heading>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-surface p-3 font-mono text-sm">{open.body}</pre>
          </>
        ) : (
          <p className="text-muted">{t.files.select}</p>
        )}
      </article>
    </div>
  );
}

export function CrmView({ crm, emit }: { crm: CustomerItem[]; emit: Emit }) {
  const [segment, setSegment] = useState("");
  const [status, setStatus] = useState("");
  const rows = crm.filter((k) => (!segment || k.segment === segment) && (!status || k.status === status));
  const apply = (seg: string, st: string) => {
    const resultCount = crm.filter((k) => (!seg || k.segment === seg) && (!st || k.status === st)).length;
    emit({ event: { type: "CRM_FILTER_APPLIED", payload: { filter: { ...(seg ? { segment: seg } : {}), ...(st ? { status: st } : {}) }, resultCount } } });
  };
  return (
    <div className="flex flex-col gap-2" data-testid="sandbox-crm">
      <Heading>{t.crm.heading}</Heading>
      <div className="flex flex-wrap gap-2">
        <select aria-label={t.crm.segment} className="rounded-md border border-border bg-bg p-2" value={segment} onChange={(e) => (setSegment(e.target.value), apply(e.target.value, status))}>
          <option value="">{t.crm.allSegments}</option>
          {["A", "B", "C"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select aria-label={t.crm.status} className="rounded-md border border-border bg-bg p-2" value={status} onChange={(e) => (setStatus(e.target.value), apply(segment, e.target.value))}>
          <option value="">{t.crm.allStatuses}</option>
          {(Object.keys(t.crm.statuses) as (keyof typeof t.crm.statuses)[]).map((s) => (
            <option key={s} value={s}>
              {t.crm.statuses[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {[t.crm.name, t.crm.industry, t.crm.city, t.crm.segment, t.crm.status, t.crm.revenue, t.crm.contact, t.crm.nps].map((h) => (
                <th key={h} className="p-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id} className="cursor-pointer border-b border-border" onClick={() => emit({ event: { type: "CRM_RECORD_OPENED", payload: { customerId: k.id } } })}>
                <td className="p-2">{k.name}</td>
                <td className="p-2">{k.industry}</td>
                <td className="p-2">{k.city}</td>
                <td className="p-2">{k.segment ?? "—"}</td>
                <td className="p-2">{t.crm.statuses[k.status]}</td>
                <td className="p-2">{k.annualRevenueDkk.toLocaleString("da-DK")}</td>
                <td className="p-2">{k.contact}</td>
                <td className="p-2">{k.nps ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SheetView({ cells }: { cells: Record<string, SheetCellView> }) {
  const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const rows = Array.from(new Set(Object.keys(cells).map((c) => Number(c.slice(1))))).sort((a, b) => a - b);
  const [selected, setSelected] = useState<string | null>(null);
  const sel = selected ? cells[selected] : undefined;
  return (
    <div className="flex flex-col gap-2" data-testid="sandbox-sheet">
      <Heading>{t.sheet.heading}</Heading>
      <div className="overflow-x-auto">
        <table className="text-right font-mono text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r} className="border-b border-border">
                <th className="p-1 text-muted">{r}</th>
                {cols.map((c) => {
                  const cell = cells[`${c}${r}`];
                  const v = cell?.value;
                  return (
                    <td key={c} className={`p-1 ${c === "A" ? "text-left" : ""} ${selected === `${c}${r}` ? "bg-surface" : ""}`} onClick={() => setSelected(`${c}${r}`)}>
                      {typeof v === "number" ? v.toLocaleString("da-DK") : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && sel && (
        <p className="text-sm">
          {selected}
          {sel.formula ? ` · ${t.sheet.formula}: ${sel.formula}` : ""}
          {sel.note ? ` · ${t.sheet.note}: ${sel.note}` : ""}
        </p>
      )}
    </div>
  );
}

const CONNECTOR_SCOPES: Record<ConnectorId, Scope[]> = {
  mail: ["mail.read", "mail.draft", "mail.send"],
  calendar: ["calendar.read", "calendar.write"],
  files: ["files.read", "files.write"],
  crm: ["crm.read", "crm.write"],
  sheet: ["sheet.read", "sheet.write"],
};

export function ConnectorsView({ state, emit }: { state: SandboxState; emit: Emit }) {
  const [dialog, setDialog] = useState<ConnectorId | null>(null);
  const [chosen, setChosen] = useState<Scope[]>([]);
  return (
    <div className="flex flex-col gap-3" data-testid="sandbox-connectors">
      <Heading>{t.connectors.heading}</Heading>
      <p className="text-muted">{t.connectors.intro}</p>
      <ul className="flex flex-col gap-2">
        {(Object.keys(CONNECTOR_SCOPES) as ConnectorId[]).map((id) => {
          const c = state.connectors[id];
          return (
            <li key={id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
              <span className="font-semibold">{t.connectors.names[id]}</span>
              <span className="text-sm text-muted">{c.connected ? `${t.connectors.connected}: ${c.scopes.map((s) => t.connectors.scopes[s]).join(", ")}` : t.connectors.notConnected}</span>
              {c.connected ? (
                <button type="button" className={`${secondary} ml-auto`} onClick={() => emit({ event: { type: "CONNECTOR_DISCONNECTED", payload: { connectorId: id } } })}>
                  {t.connectors.disconnect}
                </button>
              ) : (
                <button
                  type="button"
                  className={`${primary} ml-auto`}
                  onClick={() => {
                    setDialog(id);
                    setChosen([]);
                    emit({ event: { type: "CONNECTOR_CONNECT_STARTED", payload: { connectorId: id } } });
                  }}
                >
                  {t.connectors.connect} {t.connectors.names[id]}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {dialog && (
        <div role="dialog" aria-labelledby="perm-title" className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
          <h3 id="perm-title" className="font-semibold">
            {t.connectors.permissionTitle} ({t.connectors.names[dialog]})
          </h3>
          {CONNECTOR_SCOPES[dialog].map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input type="checkbox" checked={chosen.includes(s)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, s] : c.filter((x) => x !== s)))} />
              {t.connectors.scopes[s]}
            </label>
          ))}
          <details>
            <summary className="cursor-pointer underline">{t.connectors.whatDoesItMean}</summary>
            <p className="text-sm">{t.connectors.leastPrivilege}</p>
          </details>
          <div className="flex gap-2">
            <button
              type="button"
              className={primary}
              disabled={chosen.length === 0}
              onClick={() => {
                emit({ event: { type: "CONNECTOR_PERMISSION_GRANTED", payload: { connectorId: dialog, scopes: chosen } } });
                setDialog(null);
              }}
            >
              {t.connectors.grant}
            </button>
            <button
              type="button"
              className={secondary}
              onClick={() => {
                emit({ event: { type: "CONNECTOR_PERMISSION_DENIED", payload: { connectorId: dialog, deniedScopes: CONNECTOR_SCOPES[dialog] } } });
                setDialog(null);
              }}
            >
              {t.connectors.deny}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TextGate({ text }: { text: string }) {
  const r = detectPii(text);
  const kind = r.findings.find((f) => f.severity === "BLOCK")?.kind;
  return kind ? (
    <p role="alert" className="text-sm text-danger">
      {t.pii.blocked[kind]}
    </p>
  ) : null;
}

export function AssistantsView({ state, files, emit }: { state: SandboxState; files: FileItem[]; emit: Emit }) {
  const [instructions, setInstructions] = useState("");
  const [knowledge, setKnowledge] = useState<string[]>([]);
  const blocked = detectPii(instructions).action === "BLOCK";
  return (
    <div className="flex flex-col gap-3" data-testid="sandbox-assistants">
      <Heading>{t.assistants.heading}</Heading>
      <p className="text-muted">{t.assistants.intro}</p>
      <ul className="flex flex-col gap-1">
        {state.assistants.length === 0 && <li className="text-muted">{t.assistants.none}</li>}
        {state.assistants.map((a, i) => (
          <li key={a.id} className="rounded-md border border-border p-2">
            {format(t.assistants.created, { n: i + 1 })} · {a.knowledgeFileIds.join(", ")}
          </li>
        ))}
      </ul>
      <label className="flex flex-col gap-1">
        {t.assistants.instructions}
        <textarea className="min-h-24 rounded-md border border-border bg-bg p-2" value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={8000} />
      </label>
      <TextGate text={instructions} />
      <fieldset className="flex flex-col gap-1">
        <legend>{t.assistants.knowledge}</legend>
        {files.filter((f) => f.kind !== "sheet").map((f) => (
          <label key={f.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={knowledge.includes(f.id)} onChange={(e) => setKnowledge((k) => (e.target.checked ? [...k, f.id] : k.filter((x) => x !== f.id)))} />
            {f.name}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className={`${primary} self-start disabled:opacity-50`}
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
      </button>
    </div>
  );
}

export function AutomationsView({ state, emit }: { state: SandboxState; emit: Emit }) {
  const [prompt, setPrompt] = useState("");
  const [weekday, setWeekday] = useState(5);
  const [time, setTime] = useState("08:00");
  const blocked = detectPii(prompt).action === "BLOCK";
  return (
    <div className="flex flex-col gap-3" data-testid="sandbox-automations">
      <Heading>{t.automations.heading}</Heading>
      <p className="text-muted">{t.automations.intro}</p>
      <ul className="flex flex-col gap-2">
        {state.automations.length === 0 && <li className="text-muted">{t.automations.none}</li>}
        {state.automations.map((a, i) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
            <span>{format(t.automations.item, { n: i + 1 })}</span>
            <span className="text-sm text-muted">
              {a.enabled ? t.automations.enabled : t.automations.disabled} · {format(t.automations.testRuns, { n: a.testRuns })}
            </span>
            <button type="button" className={`${secondary} ml-auto`} onClick={() => emit({ event: { type: a.enabled ? "AUTOMATION_DISABLED" : "AUTOMATION_ENABLED", payload: { automationId: a.id } } })}>
              {a.enabled ? t.automations.disable : t.automations.enable}
            </button>
            <button type="button" className={secondary} onClick={() => emit({ event: { type: "AUTOMATION_TEST_RUN", payload: { automationId: a.id, success: true, actionsRun: a.actionTypes.length } } })}>
              {t.automations.testRun}
            </button>
          </li>
        ))}
      </ul>
      <label className="flex flex-col gap-1">
        {t.automations.prompt}
        <textarea className="min-h-20 rounded-md border border-border bg-bg p-2" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={8000} />
      </label>
      <TextGate text={prompt} />
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1">
          {t.automations.weekday}
          <select className="rounded-md border border-border bg-bg p-2" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {t.automations.weekdays.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t.automations.time}
          <input type="time" className="rounded-md border border-border bg-bg p-2" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        className={`${primary} self-start disabled:opacity-50`}
        disabled={!prompt.trim() || blocked || !/^\d{2}:\d{2}$/.test(time)}
        onClick={() => {
          emit({
            event: {
              type: "AUTOMATION_CREATED",
              payload: { automationId: newOverlayId("auto"), trigger: { type: "SCHEDULE", freq: "WEEKLY", weekday, time }, actions: [{ type: "RUN_PROMPT", connectorIds: [] }, { type: "NOTIFY_ME", connectorIds: [] }], promptCharCount: prompt.length },
            },
            contentText: prompt,
          });
          setPrompt("");
        }}
      >
        {t.automations.create}
      </button>
    </div>
  );
}

export function StubView({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Heading>{heading}</Heading>
      <p className="text-muted">{body}</p>
    </div>
  );
}
