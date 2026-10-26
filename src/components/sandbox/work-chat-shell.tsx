"use client";

import { useState, type ReactNode } from "react";
import type { IconName } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { Concept } from "@/server/sandbox/events";
import type { SandboxState } from "@/server/sandbox/reducer";
import type { NavId, SkinConfig } from "@/server/sandbox/skin-schema";
import { CONCEPT_ICON, SbIcon, type LocalIconName } from "./sandbox-icons";
import type { CalendarItem, CustomerItem, FileItem, Intent, MailItem } from "./types";
import { menuBox, menuItem, Switch, usePopover } from "./workpane-shell";

// The work-chat shell in the same structure as the real work app it trains for (from the vendor's own support pages
// and screenshots, 26 Oct 2026): sidebar with Chat | Kollega, Ny chat, Søg, Bibliotek, Agenter, Notesbøger, Fastgjort,
// Chats and the user; the app launcher at the top; "Arbejds-IQ" and "Automatisk" over the start screen; Agenter,
// Notesbøger, Søg and Bibliotek in the main area; Kollega with Automatiseringer and Tilpas. Nothing opens a new tab.

const t = getMessages().sandbox;
const w = t.workShell;
type Emit = (intent: Intent) => void;
type Icon = LocalIconName | IconName;
export type SidebarMode = "chat" | "cowork";
export type ModelMode = keyof typeof w.models;
export type Agent = (typeof w.builtInAgents)[number];

const row = (active: boolean) => cx("flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body-sm transition-colors", active ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-ink hover:bg-surface/70");
const iconButton = "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-sunken hover:text-ink";
const pill = "inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-body-sm text-ink hover:bg-sunken";
const darkPill = "inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-body-sm font-medium text-surface hover:opacity-90 disabled:opacity-40";
const SYSTEMS: Concept[] = ["MAIL", "CALENDAR", "FILES", "CRM", "SHEET"];
const COWORK: Concept[] = ["AUTOMATIONS", "SKILLS", "CONNECTORS", "PLUGINS"];

function Tile({ children, size = "md" }: { children: ReactNode; size?: "sm" | "md" }) {
  return <span className={cx("grid shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink", size === "sm" ? "size-6" : "size-10")}>{children}</span>;
}

/* ───────────────────────── Sidebar ───────────────────────── */

export function WorkSidebar({
  skin,
  concept,
  mode,
  onMode,
  conversations,
  activeConversation,
  agents,
  onNav,
  onAgent,
  onReset,
}: {
  skin: SkinConfig;
  concept: Concept;
  mode: SidebarMode;
  onMode: (m: SidebarMode) => void;
  conversations: number;
  activeConversation: boolean;
  agents: Agent[];
  onNav: (id: NavId, concept: Concept) => void;
  onAgent: (a: Agent) => void;
  onReset: () => void;
}) {
  const { open: appsOpen, setOpen: setAppsOpen, ref: appsRef } = usePopover();
  const { open: gearOpen, setOpen: setGearOpen, ref: gearRef } = usePopover();
  const [agentsOpen, setAgentsOpen] = useState(true);
  const systems = skin.nav.filter((n) => SYSTEMS.includes(n.concept));
  const nav = skin.nav.filter((n) => (n.concept === "FILES" || !SYSTEMS.includes(n.concept)) && (n.concept === "CHAT" || (mode === "cowork") === COWORK.includes(n.concept)));
  const active = (n: { id: NavId; concept: Concept }) => n.id !== "new-chat" && (n.concept === concept || (n.concept === "SKILLS" && COWORK.includes(concept) && concept !== "AUTOMATIONS"));
  const icon = (n: { id: NavId; concept: Concept }): Icon => (n.id === "new-chat" ? "plus" : n.concept === "FILES" ? "book" : n.concept === "AGENTS" ? "agent" : n.concept === "SKILLS" ? "bag" : CONCEPT_ICON[n.concept]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 px-3">
        <span className="flex-1 text-title-3 text-ink">{t.title}</span>
        <div ref={appsRef} className="relative">
          <button type="button" aria-label={w.apps} title={w.appsHint} aria-expanded={appsOpen} className={iconButton} onClick={() => setAppsOpen((o) => !o)} data-testid="app-launcher">
            <SbIcon name="apps" />
          </button>
          {appsOpen && (
            <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 w-56")}>
              <p className="px-2.5 pt-1 pb-1 text-caption text-ink-subtle">{w.apps}</p>
              <div className="grid grid-cols-3 gap-1">
                {systems.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    data-target={`nav.${n.id}`}
                    className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-caption text-ink hover:bg-sunken"
                    onClick={() => {
                      setAppsOpen(false);
                      onNav(n.id, n.concept);
                    }}
                  >
                    <Tile size="sm">
                      <SbIcon name={CONCEPT_ICON[n.concept]} size={14} />
                    </Tile>
                    {t.terms[n.labelKey]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="px-3 pb-2">
        <div role="group" aria-label={w.sidebarModeLabel} className="grid grid-cols-2 rounded-full bg-sunken p-0.5" data-testid="sidebar-mode">
          {(["chat", "cowork"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => onMode(m)} className={cx("h-7 rounded-full text-body-sm transition-colors", mode === m ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink")}>
              {w.sidebarModes[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 pb-3">
        <nav aria-label={t.frame.navLabel} className="flex flex-col gap-px" data-testid="sandbox-nav">
          {nav.map((n) =>
            n.concept === "AGENTS" ? (
              <div key={n.id} className="flex flex-col gap-px">
                <span className="flex items-center">
                  <button type="button" data-target={`nav.${n.id}`} aria-current={active(n) ? "page" : undefined} className={row(active(n))} onClick={() => onNav(n.id, n.concept)}>
                    <SbIcon name={icon(n)} className="text-ink-muted" />
                    <span className="flex-1 truncate">{t.terms[n.labelKey]}</span>
                  </button>
                  <button type="button" aria-expanded={agentsOpen} aria-label={w.toggleAgents} className={cx(iconButton, "-ml-9")} onClick={() => setAgentsOpen((o) => !o)}>
                    <SbIcon name="chevronDown" size={12} className={cx("transition-transform", !agentsOpen && "-rotate-90")} />
                  </button>
                </span>
                {agentsOpen && (
                  <div className="flex flex-col gap-px pl-6">
                    {agents.map((a) => (
                      <button key={a.id} type="button" className={row(false)} onClick={() => onAgent(a)}>
                        <SbIcon name={a.icon as Icon} size={14} className="text-accent" />
                        <span className="truncate">{a.name}</span>
                      </button>
                    ))}
                    <button type="button" className={cx(row(false), "text-ink-muted")} onClick={() => onNav(n.id, n.concept)}>
                      <SbIcon name="grid" size={14} className="text-ink-subtle" />
                      {w.allAgents}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button key={n.id} type="button" data-target={`nav.${n.id}`} aria-current={active(n) ? "page" : undefined} className={row(active(n))} onClick={() => onNav(n.id, n.concept)}>
                <SbIcon name={icon(n)} className="text-ink-muted" />
                <span className="truncate">{n.id === "new-chat" ? (mode === "cowork" ? w.newTask : w.newChat) : t.terms[n.labelKey]}</span>
              </button>
            ),
          )}
        </nav>

        {mode === "chat" && agents.length > 0 && (
          <section aria-label={w.pinned} className="flex flex-col gap-px">
            <h2 className="px-2.5 pb-1 text-caption text-ink-subtle">{w.pinned}</h2>
            {agents.slice(0, 3).map((a) => (
              <button key={a.id} type="button" className={row(false)} onClick={() => onAgent(a)}>
                <SbIcon name={a.icon as Icon} size={14} className="text-ink-muted" />
                <span className="truncate">{a.name}</span>
              </button>
            ))}
          </section>
        )}

        <section aria-label={mode === "cowork" ? w.tasks : w.chats} className="flex flex-col gap-px">
          <h2 className="px-2.5 pb-1 text-caption text-ink-subtle">{mode === "cowork" ? w.tasks : w.chats}</h2>
          {conversations === 0 ? (
            <p className="px-2.5 text-body-sm text-ink-subtle">{w.noChats}</p>
          ) : (
            Array.from({ length: Math.min(conversations, 12) }, (_, i) => conversations - i).map((n, i) =>
              i === 0 && activeConversation ? (
                <button key={n} type="button" className={row(concept === "CHAT")} onClick={() => onNav("chat", "CHAT")}>
                  <span className="truncate">{format(t.chat.conversation, { n })}</span>
                </button>
              ) : (
                <p key={n} className="flex h-9 items-center px-2.5 text-body-sm text-ink-subtle">
                  <span className="truncate">{format(t.chat.conversation, { n })}</span>
                </p>
              ),
            )
          )}
        </section>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 border-t border-line px-3 py-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-caption font-semibold text-on-accent">{t.frame.userInitials}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 truncate text-body-sm text-ink">
            {t.frame.user}
            <span className="rounded-sm bg-ink px-1 text-[0.625rem] leading-4 font-medium text-surface">{w.badge}</span>
          </span>
          <span className="truncate text-caption text-ink-subtle">{w.plan}</span>
        </span>
        <div ref={gearRef} className="relative">
          <button type="button" aria-label={t.terms.settings} aria-expanded={gearOpen} className={iconButton} onClick={() => setGearOpen((o) => !o)}>
            <SbIcon name="gear" />
          </button>
          {gearOpen && (
            <div role="menu" className={cx(menuBox, "absolute right-0 bottom-full mb-1 w-52")}>
              <button
                type="button"
                role="menuitem"
                className={menuItem}
                onClick={() => {
                  setGearOpen(false);
                  onReset();
                }}
              >
                <SbIcon name="refresh" className="text-ink-subtle" />
                {t.terms.reset}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Top bar and composer ───────────────────────── */

/** "Arbejds-IQ" and "Automatisk ▾" on the left, protection and new chat on the right. */
export function WorkTopBar({ workIq, onWorkIq, model, onModel, onNewChat, emit }: { workIq: boolean; onWorkIq: (on: boolean) => void; model: ModelMode; onModel: (m: ModelMode) => void; onNewChat: () => void; emit: Emit }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="flex h-12 shrink-0 items-center gap-1.5 px-4" data-testid="work-topbar">
      <button
        type="button"
        aria-pressed={workIq}
        title={workIq ? w.workIqOn : w.workIqOff}
        onClick={() => {
          onWorkIq(!workIq);
          emit({ event: { type: "SETTING_CHANGED", payload: { key: "work-iq", value: !workIq } } });
        }}
        className={cx("inline-flex h-7 items-center rounded-md px-2.5 text-caption font-medium transition-colors", workIq ? "bg-sunken text-ink ring-1 ring-line" : "text-ink-muted hover:bg-sunken")}
        data-testid="work-iq"
      >
        {w.workIq}
      </button>
      <div ref={ref} className="relative">
        <button type="button" aria-expanded={open} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-caption text-ink-muted hover:bg-sunken hover:text-ink" onClick={() => setOpen((o) => !o)} data-testid="model-mode">
          {w.models[model].label}
          <SbIcon name="chevronDown" size={12} />
        </button>
        {open && (
          <div role="menu" className={cx(menuBox, "absolute top-full left-0 mt-1 w-64")}>
            {(Object.keys(w.models) as ModelMode[]).map((k) => (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={model === k}
                className={menuItem}
                onClick={() => {
                  onModel(k);
                  emit({ event: { type: "SETTING_CHANGED", payload: { key: "model-mode", value: k } } });
                  setOpen(false);
                }}
              >
                <span className="flex flex-1 flex-col">
                  <span>{w.models[k].label}</span>
                  <span className="text-caption text-ink-subtle">{w.models[k].hint}</span>
                </span>
                {model === k && <SbIcon name="check" size={14} className="text-accent" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="ml-auto grid size-8 place-items-center text-success" title={w.protected} aria-label={w.protected} role="img">
        <SbIcon name="shield" />
      </span>
      <button type="button" aria-label={w.newChat} title={w.newChat} className={iconButton} onClick={onNewChat}>
        <SbIcon name="compose" />
      </button>
    </div>
  );
}

/** The composer's "+" menu: work content, upload, cloud files, then agents and plugins. */
export function WorkMenu({
  close,
  openPicker,
  agents,
  onAgent,
  plugins,
  onTogglePlugin,
  onManage,
  emit,
}: {
  close: () => void;
  openPicker: () => void;
  agents: Agent[];
  onAgent: (a: Agent) => void;
  plugins: { id: string; label: string; on: boolean }[];
  onTogglePlugin: (id: string, on: boolean) => void;
  onManage: () => void;
  emit: Emit;
}) {
  const m = w.menu;
  const attach = () => {
    openPicker();
    emit({ event: { type: "UI_CLICKED", target: "composer.attach", payload: { region: "composer", control: "attach" } } });
  };
  return (
    <div className="flex max-h-96 flex-col overflow-y-auto">
      {([["building", m.work], ["paperclip", m.upload], ["book", m.cloud]] as const).map(([i, l]) => (
        <button key={l.label} type="button" role="menuitem" className={menuItem} onClick={attach}>
          <SbIcon name={i} className="text-ink-subtle" />
          <span className="flex flex-1 flex-col">
            <span>{l.label}</span>
            <span className="text-caption text-ink-subtle">{l.hint}</span>
          </span>
        </button>
      ))}
      <div className="my-1 h-px bg-line" />
      <p className="px-2.5 pt-1 pb-1 text-caption text-ink-subtle">{m.agents}</p>
      {agents.length === 0 && <p className="px-2.5 py-1 text-caption text-ink-subtle">{m.noAgents}</p>}
      {agents.map((a) => (
        <button
          key={a.id}
          type="button"
          role="menuitem"
          className={menuItem}
          onClick={() => {
            close();
            onAgent(a);
          }}
        >
          <SbIcon name={a.icon as Icon} className="text-accent" />
          {a.name}
        </button>
      ))}
      <div className="my-1 h-px bg-line" />
      <p className="px-2.5 pt-1 pb-1 text-caption text-ink-subtle">{m.plugins}</p>
      {plugins.length === 0 && <p className="px-2.5 py-1 text-caption text-ink-subtle">{m.noPlugins}</p>}
      {plugins.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink" data-testid="menu-connector" data-id={p.id}>
          <span className="flex-1 truncate">{p.label}</span>
          <Switch on={p.on} label={format(p.on ? t.connectors.catalog.turnOff : t.connectors.catalog.turnOn, { name: p.label })} onChange={(on) => onTogglePlugin(p.id, on)} />
        </div>
      ))}
      <button
        type="button"
        className={cx(menuItem, "text-ink-muted")}
        onClick={() => {
          close();
          onManage();
        }}
      >
        <SbIcon name="plug" className="text-ink-subtle" />
        {m.manage}
      </button>
    </div>
  );
}

/** Prompt chips under the composer: Foreslået ▾ · Lær … · Forbered … · ⋯ (Chat), task starters (Kollega). */
export function WorkChips({ mode, setText }: { mode: SidebarMode; setText: (s: string) => void }) {
  const { open, setOpen, ref } = usePopover();
  const chip = "inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-caption text-ink hover:bg-sunken";
  if (mode === "cowork")
    return (
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {w.coworkChips.map((k) => (
          <button key={k.label} type="button" className={chip} onClick={() => setText(k.text)}>
            {k.label}
          </button>
        ))}
      </div>
    );
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2" data-testid="work-chips">
      <div ref={ref} className="relative">
        <button type="button" aria-expanded={open} className={chip} onClick={() => setOpen((o) => !o)}>
          {w.chips.suggested}
          <SbIcon name="chevronDown" size={12} />
        </button>
        {open && (
          <div role="menu" className={cx(menuBox, "absolute top-full left-0 mt-1 w-80")}>
            {w.chips.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                role="menuitem"
                className={menuItem}
                onClick={() => {
                  setOpen(false);
                  setText(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className={chip} onClick={() => setText(w.chips.learn.text)}>
        {w.chips.learn.label}
      </button>
      <button type="button" className={chip} onClick={() => setText(w.chips.prepare.text)}>
        {w.chips.prepare.label}
      </button>
      <button type="button" aria-label={w.chips.more} className={iconButton} onClick={() => setOpen(true)}>
        <SbIcon name="dots" />
      </button>
    </div>
  );
}

/* ───────────────────────── Pages ───────────────────────── */

function Page({ title, lead, actions, children, testId }: { title: string; lead?: string; actions?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surface" data-testid={testId}>
      <div className="mx-auto flex w-full max-w-[52rem] flex-col gap-5 px-4 pt-4 pb-16 sm:px-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-title-2 text-ink">{title}</h2>
            {lead && <p className="text-body-sm text-ink-muted">{lead}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange, label, autoFocus = false }: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <SbIcon name="search" size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle" />
      <input type="search" autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-body-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none" />
    </label>
  );
}

function Tabs<K extends string>({ value, onChange, items, label }: { value: K; onChange: (k: K) => void; items: { key: K; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-4 border-b border-line">
      {items.map((i) => (
        <button key={i.key} type="button" aria-pressed={value === i.key} onClick={() => onChange(i.key)} className={cx("-mb-px border-b-2 pb-2 text-body-sm", value === i.key ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink")}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

function Detail({ title, meta, body, onBack }: { title: string; meta?: string; body: string; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 self-start text-body-sm text-ink-muted hover:text-ink">
        <SbIcon name="arrowLeft" size={14} />
        {w.search.back}
      </button>
      <h3 className="text-title-3 text-ink">{title}</h3>
      {meta && <p className="text-caption text-ink-subtle">{meta}</p>}
      <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-5 font-sans text-body leading-relaxed whitespace-pre-wrap text-ink">{body}</pre>
    </div>
  );
}

type Hit = { kind: "mail" | "meetings" | "files" | "people"; id: string; title: string; sub: string; icon: Icon };

/** Søg: one box over Nordlys' mails, meetings, files and customers, with Alle / Mails / Møder / Filer / Personer. */
export function WorkSearch({ mail, calendar, files, crm, emit }: { mail: MailItem[]; calendar: CalendarItem[]; files: FileItem[]; crm: CustomerItem[]; emit: Emit }) {
  const s = w.search;
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<keyof typeof s.tabs>("all");
  const [open, setOpen] = useState<Hit | null>(null);
  const needle = q.trim().toLocaleLowerCase("da");
  const has = (...v: string[]) => v.join(" ").toLocaleLowerCase("da").includes(needle);
  const hits: Hit[] = !needle
    ? []
    : [
        ...mail.filter((m) => has(m.subject, m.fromName, m.body)).map((m) => ({ kind: "mail" as const, id: m.id, title: m.subject, sub: `${format(s.from, { name: m.fromName })} · ${m.dateLabel}`, icon: "mail" as Icon })),
        ...calendar.filter((c) => has(c.title, c.attendees.join(" "), c.note ?? "")).map((c) => ({ kind: "meetings" as const, id: c.id, title: c.title, sub: `${c.dateLabel} · ${c.start}–${c.end}`, icon: "calendar" as Icon })),
        ...files.filter((f) => has(f.name, f.summary)).map((f) => ({ kind: "files" as const, id: f.id, title: f.name, sub: f.summary, icon: (f.kind === "doc" ? "file" : "table") as Icon })),
        ...crm.filter((k) => has(k.name, k.contact, k.city)).map((k) => ({ kind: "people" as const, id: k.id, title: k.name, sub: `${k.contact} · ${k.city}`, icon: "building" as Icon })),
      ];
  const shown = hits.filter((h) => tab === "all" || h.kind === tab);
  const openHit = (h: Hit) => {
    if (h.kind === "mail") emit({ event: { type: "MAIL_OPENED", payload: { mailId: h.id } } });
    if (h.kind === "meetings") emit({ event: { type: "CALENDAR_EVENT_OPENED", payload: { eventId: h.id } } });
    if (h.kind === "files") emit({ event: { type: "FILE_OPENED", payload: { fileId: h.id } } });
    if (h.kind === "people") emit({ event: { type: "CRM_RECORD_OPENED", payload: { customerId: h.id } } });
    setOpen(h);
  };
  const body = (h: Hit) => {
    if (h.kind === "mail") return mail.find((m) => m.id === h.id)?.body ?? "";
    if (h.kind === "meetings") {
      const c = calendar.find((x) => x.id === h.id);
      return c ? `${t.calendar.attendees}: ${c.attendees.join(", ")}${c.note ? `\n\n${c.note}` : ""}` : "";
    }
    if (h.kind === "files") return files.find((f) => f.id === h.id)?.body ?? h.sub;
    const k = crm.find((x) => x.id === h.id);
    return k ? `${k.industry} · ${k.city}\n${k.contact}` : "";
  };
  return (
    <Page title={s.title} testId="sandbox-search">
      {open ? (
        <Detail title={open.title} meta={open.sub} body={body(open)} onBack={() => setOpen(null)} />
      ) : (
        <>
          <SearchBox value={q} onChange={setQ} label={s.placeholder} autoFocus />
          <Tabs label={s.title} value={tab} onChange={setTab} items={(Object.keys(s.tabs) as (keyof typeof s.tabs)[]).map((k) => ({ key: k, label: s.tabs[k] }))} />
          {!needle ? (
            <p className="text-body-sm text-ink-muted">{s.empty}</p>
          ) : shown.length === 0 ? (
            <p className="text-body-sm text-ink-muted">{s.none}</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="search-results">
              {shown.slice(0, 40).map((h) => (
                <li key={`${h.kind}-${h.id}`}>
                  <button type="button" onClick={() => openHit(h)} className="flex w-full items-start gap-3 px-1 py-2.5 text-left hover:bg-sunken/60">
                    <SbIcon name={h.icon} className="mt-0.5 text-accent" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body-sm text-ink">{h.title}</span>
                      <span className="truncate text-caption text-ink-muted">{h.sub}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Page>
  );
}

/** Bibliotek: Nordlys' files as a list (name, type) with Alle / Dokumenter / Regneark / Sider / Billeder. */
export function WorkLibrary({ files, emit, onOpenSheet }: { files: FileItem[]; emit: Emit; onOpenSheet: () => void }) {
  const l = w.library;
  const [tab, setTab] = useState<keyof typeof l.tabs>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<FileItem | null>(null);
  const needle = q.trim().toLocaleLowerCase("da");
  const list = files.filter((f) => (tab === "all" || (tab === "docs" && f.kind === "doc") || (tab === "sheets" && f.kind !== "doc")) && (!needle || `${f.name} ${f.summary}`.toLocaleLowerCase("da").includes(needle)));
  const openFile = (f: FileItem) => {
    if (f.kind === "sheet") return onOpenSheet();
    emit({ event: { type: "FILE_OPENED", payload: { fileId: f.id } } });
    setOpen(f);
  };
  if (open)
    return (
      <Page title={l.title} testId="sandbox-files">
        <Detail title={open.name} meta={open.summary} body={open.body ?? open.summary} onBack={() => setOpen(null)} />
      </Page>
    );
  const empty = tab === "pages" ? l.noPages : tab === "images" ? l.noImages : l.noHits;
  const shown = tab === "pages" || tab === "images" ? [] : list;
  return (
    <Page title={l.title} testId="sandbox-files" actions={<div className="w-56 max-sm:hidden"><SearchBox value={q} onChange={setQ} label={l.search} /></div>}>
      <div className="sm:hidden">
        <SearchBox value={q} onChange={setQ} label={l.search} />
      </div>
      <Tabs label={l.title} value={tab} onChange={setTab} items={(Object.keys(l.tabs) as (keyof typeof l.tabs)[]).map((k) => ({ key: k, label: l.tabs[k] }))} />
      {shown.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => openFile(f)} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-sunken/60" data-testid="library-file">
                <SbIcon name={f.kind === "doc" ? "file" : "table"} className="text-accent" />
                <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{f.name}</span>
                <span className="hidden w-44 truncate text-caption text-ink-muted sm:block">{t.files.kinds[f.kind]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

type AgentCategory = keyof typeof w.agents.categories;

/** Agenter: the store with categories on the left, search, cards with Tilføj / Åbn, and Opret agent. */
export function AgentsStore({ state, emit, onOpen, builder }: { state: SandboxState; emit: Emit; onOpen: (a: Agent) => void; builder: ReactNode }) {
  const a = w.agents;
  const [cat, setCat] = useState<AgentCategory>("all");
  const [q, setQ] = useState("");
  const [building, setBuilding] = useState(false);
  const added = state.installed?.agents ?? [];
  const needle = q.trim().toLocaleLowerCase("da");
  const list = w.builtInAgents.filter((x) => (cat !== "yours" || added.includes(x.id)) && (!needle || `${x.name} ${x.description}`.toLocaleLowerCase("da").includes(needle)));
  const toggle = (x: Agent) => emit({ event: { type: "SETTING_CHANGED", payload: { key: added.includes(x.id) ? "agent-removed" : "agent-added", value: x.id } } });

  if (building)
    return (
      <div className="flex min-h-0 flex-1 flex-col" data-testid="agent-builder">
        <div className="px-4 pt-3 sm:px-6">
          <button type="button" onClick={() => setBuilding(false)} className="inline-flex items-center gap-1 text-body-sm text-ink-muted hover:text-ink">
            <SbIcon name="arrowLeft" size={14} />
            {a.title}
          </button>
        </div>
        {builder}
      </div>
    );

  return (
    <Page
      title={a.title}
      lead={a.lead}
      testId="sandbox-agents"
      actions={
        <button type="button" className={pill} onClick={() => setBuilding(true)}>
          <SbIcon name="plus" size={14} />
          {a.create}
        </button>
      }
    >
      <div className="flex flex-col gap-5 sm:flex-row">
        <nav aria-label={a.title} className="flex shrink-0 gap-1 overflow-x-auto sm:w-48 sm:flex-col">
          {(Object.keys(a.categories) as AgentCategory[]).map((k) => (
            <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)} className={cx("min-h-8 shrink-0 rounded-md px-2.5 py-1.5 text-left text-body-sm whitespace-nowrap sm:whitespace-normal", cat === k ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink")}>
              {a.categories[k]}
            </button>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <SearchBox value={q} onChange={setQ} label={a.search} />
          {cat === "org" ? (
            <p className="text-body-sm text-ink-muted">{a.noOrg}</p>
          ) : list.length === 0 ? (
            <p className="text-body-sm text-ink-muted">{cat === "yours" ? a.noYours : t.chatShell.plugins.noHits}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {list.map((x) => {
                const on = added.includes(x.id);
                return (
                  <li key={x.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4" data-testid="agent-card" data-id={x.id}>
                    <span className="flex items-start gap-3">
                      <Tile>
                        <SbIcon name={x.icon as Icon} />
                      </Tile>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-label text-ink">{x.name}</span>
                        <span className="text-caption text-ink-subtle">{a.categories.builtIn}</span>
                      </span>
                    </span>
                    <span className="text-body-sm text-ink-muted">{x.description}</span>
                    <span className="mt-auto flex gap-2">
                      {on ? (
                        <>
                          <button type="button" className={darkPill} onClick={() => onOpen(x)}>
                            {a.open}
                          </button>
                          <button type="button" className={pill} aria-label={format(a.remove, { name: x.name })} onClick={() => toggle(x)}>
                            <SbIcon name="check" size={14} className="text-accent" />
                            {a.added}
                          </button>
                        </>
                      ) : (
                        <button type="button" className={pill} aria-label={`${a.add} ${x.name}`} onClick={() => toggle(x)}>
                          <SbIcon name="plus" size={14} />
                          {a.add}
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Page>
  );
}

type RefKind = "files" | "meetings" | "mail";

/** Notesbøger: collect files, meetings and mails as references and chat with them together. */
export function NotebooksPage({ files, calendar, mail, onChat }: { files: FileItem[]; calendar: CalendarItem[]; mail: MailItem[]; onChat: (text: string) => void }) {
  const n = w.notebooks;
  const [books, setBooks] = useState<{ id: number; refs: string[] }[]>([]);
  const [creating, setCreating] = useState(false);
  const [openBook, setOpenBook] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | RefKind>("all");
  const [picked, setPicked] = useState<string[]>([]);
  const refs: { kind: RefKind; id: string; label: string; icon: Icon }[] = [
    ...files.map((f) => ({ kind: "files" as const, id: f.id, label: f.name, icon: (f.kind === "doc" ? "file" : "table") as Icon })),
    ...calendar.slice(0, 8).map((c) => ({ kind: "meetings" as const, id: c.id, label: c.title, icon: "calendar" as Icon })),
    ...mail.slice(0, 8).map((m) => ({ kind: "mail" as const, id: m.id, label: m.subject, icon: "mail" as Icon })),
  ];
  const label = (id: string) => refs.find((r) => r.id === id)?.label ?? id;
  const book = books.find((b) => b.id === openBook);

  if (book)
    return (
      <Page title={format(n.name, { n: book.id })} lead={format(n.count, { n: book.refs.length })} testId="sandbox-notebooks">
        <button type="button" onClick={() => setOpenBook(null)} className="inline-flex items-center gap-1 self-start text-body-sm text-ink-muted hover:text-ink">
          <SbIcon name="arrowLeft" size={14} />
          {n.back}
        </button>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {book.refs.map((id) => (
            <li key={id} className="flex items-center gap-3 px-4 py-2.5 text-body-sm text-ink">
              <SbIcon name={refs.find((r) => r.id === id)?.icon ?? "file"} className="text-accent" />
              <span className="truncate">{label(id)}</span>
            </li>
          ))}
        </ul>
        <button type="button" className={cx(darkPill, "self-start")} onClick={() => onChat(format(n.chatText, { refs: book.refs.map(label).join(", ") }))}>
          <SbIcon name="chat" size={14} />
          {n.chat}
        </button>
      </Page>
    );

  if (creating)
    return (
      <Page title={n.createTitle} testId="sandbox-notebooks">
        <p className="text-label text-ink">{n.references}</p>
        <Tabs label={n.references} value={filter} onChange={setFilter} items={(Object.keys(n.filters) as ("all" | RefKind)[]).map((k) => ({ key: k, label: n.filters[k] }))} />
        <ul className="flex max-h-80 flex-col gap-px overflow-y-auto">
          {refs
            .filter((r) => filter === "all" || r.kind === filter)
            .map((r) => (
              <li key={r.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-body-sm text-ink hover:bg-sunken">
                  <input type="checkbox" checked={picked.includes(r.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, r.id] : p.filter((x) => x !== r.id)))} className="size-4 accent-[var(--color-accent)]" />
                  <SbIcon name={r.icon} className="text-ink-subtle" />
                  <span className="truncate">{r.label}</span>
                </label>
              </li>
            ))}
        </ul>
        <p className="rounded-xl border border-dashed border-line-strong/60 p-4 text-center text-caption text-ink-subtle">{n.drop}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className={pill} onClick={() => (setCreating(false), setPicked([]))}>
            {n.cancel}
          </button>
          <button
            type="button"
            disabled={picked.length === 0}
            className={darkPill}
            onClick={() => {
              const id = books.length + 1;
              setBooks((b) => [...b, { id, refs: picked }]);
              setPicked([]);
              setCreating(false);
              setOpenBook(id);
            }}
          >
            {n.create}
          </button>
        </div>
      </Page>
    );

  return (
    <Page
      title={n.title}
      lead={n.lead}
      testId="sandbox-notebooks"
      actions={
        <button type="button" className={pill} onClick={() => setCreating(true)}>
          <SbIcon name="plus" size={14} />
          {n.new}
        </button>
      }
    >
      {books.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{n.none}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {books.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => setOpenBook(b.id)} className="flex w-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 text-left hover:shadow-md">
                <Tile>
                  <SbIcon name="notebook" />
                </Tile>
                <span className="text-label text-ink">{format(n.name, { n: b.id })}</span>
                <span className="text-caption text-ink-muted">{format(n.count, { n: b.refs.length })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
