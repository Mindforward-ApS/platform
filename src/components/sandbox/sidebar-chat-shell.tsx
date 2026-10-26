"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { detectPii } from "@/lib/pii";
import type { Concept } from "@/server/sandbox/events";
import type { SandboxState } from "@/server/sandbox/reducer";
import type { NavId, SkinConfig } from "@/server/sandbox/skin-schema";
import { newOverlayId } from "./api";
import { ConnectDialog, disconnectItem, isLinked, startConnect } from "./connector-catalog";
import { CONCEPT_ICON, SbIcon, type LocalIconName } from "./sandbox-icons";
import type { CatalogItem, FileItem, Intent, PracticeView } from "./types";
import { PracticeConnectors } from "./views";
import { menuBox, menuItem, Switch, usePopover } from "./workpane-shell";
import type { IconName } from "@/components/ui/icons";

// The sidebar-chat shell in the same structure as the real desktop app it trains for: sidebar (Ny chat, Planlagt,
// Bibliotek, Plugins, Udforsk, Projekter, Seneste, the user), Chat | Work at the top, the one-row Chat composer or the
// Work box, and the Planlagt, Bibliotek, Plugins | Skills and GPT'er pages in the main area. Nothing opens a new tab.
// Look and feel come from Mindforward's tokens; the model is always called Øvemodel.

const t = getMessages().sandbox;
const c = t.chatShell;
type Emit = (intent: Intent) => void;
type Icon = LocalIconName | IconName;
export type ChatMode = "chat" | "work";
export type Effort = keyof typeof c.efforts;

const row = (active: boolean) => cx("flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body-sm transition-colors", active ? "bg-sunken text-ink" : "text-ink hover:bg-sunken/70");
const darkButton = "inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-body-sm font-medium text-surface hover:opacity-90";
const iconButton = "grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-sunken hover:text-ink";
const SYSTEMS: Concept[] = ["MAIL", "CALENDAR", "CRM", "SHEET"];

function Tile({ children, size = "md" }: { children: ReactNode; size?: "sm" | "md" }) {
  return <span className={cx("grid shrink-0 place-items-center rounded-lg bg-sunken text-label text-ink ring-1 ring-line ring-inset", size === "sm" ? "size-8" : "size-10")}>{children}</span>;
}

/* ───────────────────────── Sidebar ───────────────────────── */

export function ChatSidebar({
  skin,
  concept,
  conversations,
  activeConversation,
  onNav,
  onReset,
  onSearch,
}: {
  skin: SkinConfig;
  concept: Concept;
  conversations: number;
  activeConversation: boolean;
  onNav: (id: NavId, concept: Concept) => void;
  onReset: () => void;
  onSearch: () => void;
}) {
  const { open: exploreOpen, setOpen: setExploreOpen, ref: exploreRef } = usePopover();
  const primary = skin.nav.filter((n) => !SYSTEMS.includes(n.concept) && n.concept !== "ASSISTANTS");
  const gpts = skin.nav.find((n) => n.concept === "ASSISTANTS");
  const work = skin.nav.filter((n) => SYSTEMS.includes(n.concept));
  const active = (n: { id: NavId; concept: Concept }) => n.id !== "new-chat" && (n.concept === concept || (n.concept === "CONNECTORS" && concept === "SKILLS"));
  const icon = (n: { id: NavId; concept: Concept }): Icon => (n.id === "new-chat" ? "compose" : n.concept === "FILES" ? "book" : CONCEPT_ICON[n.concept]);
  const go = (id: NavId, to: Concept) => {
    setExploreOpen(false);
    onNav(id, to);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 px-3">
        <span className="flex-1 text-title-3 text-ink">{t.title}</span>
        <button type="button" aria-label={c.search} title={c.search} className={iconButton} onClick={onSearch} data-testid="sidebar-search">
          <SbIcon name="search" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 pb-3">
        <nav aria-label={t.frame.navLabel} className="flex flex-col gap-px" data-testid="sandbox-nav">
          {primary.map((n) => (
            <button key={n.id} type="button" data-target={`nav.${n.id}`} aria-current={active(n) ? "page" : undefined} className={row(active(n))} onClick={() => go(n.id, n.concept)}>
              <SbIcon name={icon(n)} className="text-ink-muted" />
              <span className="truncate">{t.terms[n.labelKey]}</span>
            </button>
          ))}
          <div ref={exploreRef}>
            <button type="button" aria-expanded={exploreOpen} className={row(concept === "ASSISTANTS" || SYSTEMS.includes(concept))} onClick={() => setExploreOpen((o) => !o)} data-testid="sidebar-explore">
              <SbIcon name="dots" className="text-ink-muted" />
              {t.terms.explore}
            </button>
            {exploreOpen && (
              <div role="menu" className={cx(menuBox, "mt-1")}>
                {([["maps", "route"], ["images", "sparkle"]] as const).map(([k, i]) => (
                  <p key={k} className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink-subtle">
                    <SbIcon name={i} />
                    <span className="flex-1">{c.explore[k]}</span>
                    <span className="text-caption">{c.explore.soon}</span>
                  </p>
                ))}
                {gpts && (
                  <button type="button" role="menuitem" data-target={`nav.${gpts.id}`} className={menuItem} onClick={() => go(gpts.id, gpts.concept)}>
                    <SbIcon name="assistant" className="text-ink-subtle" />
                    {t.terms[gpts.labelKey]}
                  </button>
                )}
                <p className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink-subtle">
                  <SbIcon name="grid" />
                  <span className="flex-1">{c.explore.sites}</span>
                  <span className="text-caption">{c.explore.soon}</span>
                </p>
                <div className="my-1 h-px bg-line" />
                <p className="px-2.5 pt-1 pb-1 text-caption text-ink-subtle">{c.explore.systems}</p>
                {work.map((n) => (
                  <button key={n.id} type="button" role="menuitem" data-target={`nav.${n.id}`} className={menuItem} onClick={() => go(n.id, n.concept)}>
                    <SbIcon name={CONCEPT_ICON[n.concept]} className="text-ink-subtle" />
                    {t.terms[n.labelKey]}
                  </button>
                ))}
                <div className="my-1 h-px bg-line" />
                <button
                  type="button"
                  role="menuitem"
                  className={menuItem}
                  onClick={() => {
                    setExploreOpen(false);
                    onReset();
                  }}
                >
                  <SbIcon name="refresh" className="text-ink-subtle" />
                  {t.terms.reset}
                </button>
              </div>
            )}
          </div>
        </nav>

        <section aria-label={c.projects} className="flex flex-col gap-px">
          <h2 className="px-2.5 pb-1 text-caption text-ink-subtle">{c.projects}</h2>
          <p className="px-2.5 text-body-sm text-ink-subtle">{c.noProjects}</p>
        </section>

        <section aria-label={c.recent} className="flex flex-col gap-px">
          <h2 className="px-2.5 pb-1 text-caption text-ink-subtle">{c.recent}</h2>
          {conversations === 0 ? (
            <p className="px-2.5 text-body-sm text-ink-subtle">{t.chat.noHistory}</p>
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
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-caption font-semibold text-on-accent">{t.frame.userInitials}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm text-ink">{t.frame.user}</span>
          <span className="truncate text-caption text-ink-subtle">{c.plan}</span>
        </span>
      </div>
    </div>
  );
}

/** "Søg …" in a dialog over the page, with the recent chats. */
export function SearchDialog({ conversations, activeConversation, onOpen, onClose }: { conversations: number; activeConversation: boolean; onOpen: () => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const all = Array.from({ length: conversations }, (_, i) => conversations - i);
  const needle = q.trim().toLocaleLowerCase("da");
  const hits = all.filter((n) => !needle || format(t.chat.conversation, { n }).toLocaleLowerCase("da").includes(needle));
  return (
    <div className="fixed inset-0 z-50 grid place-items-start justify-center p-4 pt-[18vh]" role="dialog" aria-modal="true" aria-label={c.search} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <button type="button" aria-label={t.connectors.catalog.close} className="absolute inset-0 bg-night/30" onClick={onClose} />
      <div className="relative flex w-[min(34rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-lg" data-testid="search-dialog">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <label className="flex-1">
            <span className="sr-only">{c.search}</span>
            <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.searchPlaceholder} className="h-12 w-full bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none" />
          </label>
          <button type="button" aria-label={t.connectors.catalog.close} className={iconButton} onClick={onClose}>
            <SbIcon name="x" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          <p className="px-2.5 pt-1 pb-1.5 text-caption text-ink-subtle">{c.recentChats}</p>
          {hits.length === 0 && <p className="px-2.5 py-2 text-body-sm text-ink-muted">{c.noChats}</p>}
          {hits.map((n, i) =>
            i === 0 && activeConversation && !needle ? (
              <button key={n} type="button" className={menuItem} onClick={onOpen}>
                <SbIcon name="chat" className="text-ink-subtle" />
                {format(t.chat.conversation, { n })}
              </button>
            ) : (
              <p key={n} className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink-muted">
                <SbIcon name="chat" className="text-ink-subtle" />
                {format(t.chat.conversation, { n })}
              </p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Composer parts ───────────────────────── */

/** Chat | Work, centered at the top of the start screen. */
export function ModeToggle({ mode, onMode }: { mode: ChatMode; onMode: (m: ChatMode) => void }) {
  return (
    <div role="group" aria-label={c.modeLabel} className="flex rounded-full bg-sunken p-0.5" data-testid="mode-toggle">
      {(["chat", "work"] as const).map((m) => (
        <button key={m} type="button" aria-pressed={mode === m} onClick={() => onMode(m)} className={cx("h-7 rounded-full px-4 text-body-sm transition-colors", mode === m ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink")}>
          {c.modes[m]}
        </button>
      ))}
    </div>
  );
}

/** The effort button by send ("Mellem ▾" in Chat, "Øvemodel Maks ▾" in Work) and its menu. */
export function EffortButton({ mode, effort, onEffort, emit }: { mode: ChatMode; effort: Effort; onEffort: (e: Effort) => void; emit: Emit }) {
  const { open, setOpen, ref } = usePopover();
  const keys = Object.keys(c.efforts) as Effort[];
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-label={`${c.effortTitle}: ${c.efforts[effort]}`} className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-body-sm text-ink-muted hover:bg-sunken hover:text-ink" onClick={() => setOpen((o) => !o)} data-testid="effort-button">
        {mode === "work" && (
          <>
            <SbIcon name="lightning" size={14} className="text-ink" />
            <span className="text-ink">{t.modelLabel}</span>
          </>
        )}
        {c.efforts[effort]}
        <SbIcon name="chevronDown" size={12} />
      </button>
      {open && (
        <div role="dialog" aria-label={c.effortTitle} className={cx(menuBox, "absolute top-full right-0 mt-2 w-64 gap-2 p-3")}>
          <p className="text-center text-label text-ink">{c.efforts[effort]}</p>
          <div className="grid grid-cols-4 gap-1 rounded-full bg-sunken p-1">
            {keys.map((k, i) => (
              <button
                key={k}
                type="button"
                aria-pressed={effort === k}
                title={c.efforts[k]}
                onClick={() => {
                  onEffort(k);
                  emit({ event: { type: "SETTING_CHANGED", payload: { key: "effort", value: k } } });
                }}
                className={cx("h-6 rounded-full text-caption transition-colors", keys.indexOf(effort) >= i ? "bg-accent text-on-accent" : "text-ink-muted hover:text-ink")}
              >
                {c.efforts[k]}
              </button>
            ))}
          </div>
          <p className="text-center text-caption text-ink-subtle">{c.effortTitle}</p>
        </div>
      )}
    </div>
  );
}

export function MicButton() {
  return (
    <span className="grid size-8 place-items-center rounded-full text-ink-subtle max-sm:hidden" aria-hidden="true">
      <SbIcon name="mic" />
    </span>
  );
}

export interface ChatMenuSettings {
  web: boolean;
  research: boolean;
}

/** The "+" menu: the tool's items with a short hint each, then the installed plugins. */
export function ChatMenu({
  mode,
  close,
  openPicker,
  plugins,
  onTogglePlugin,
  settings,
  onSettings,
  onDraft,
  onManagePlugins,
  emit,
}: {
  mode: ChatMode;
  close: () => void;
  openPicker: () => void;
  plugins: { id: string; label: string; on: boolean }[];
  onTogglePlugin: (id: string, on: boolean) => void;
  settings: ChatMenuSettings;
  onSettings: (n: Partial<ChatMenuSettings>) => void;
  onDraft: (text: string) => void;
  onManagePlugins: () => void;
  emit: Emit;
}) {
  const m = c.menu;
  const item = (icon: Icon, label: { label: string; hint: string }, onClick: (() => void) | null, checked?: boolean) => (
    <button key={label.label} type="button" role={checked === undefined ? "menuitem" : "menuitemcheckbox"} aria-checked={checked} disabled={!onClick} title={onClick ? undefined : m.soon} className={cx(menuItem, "disabled:cursor-not-allowed disabled:opacity-50")} onClick={onClick ?? undefined}>
      <SbIcon name={icon} className="text-ink-subtle" />
      <span className="shrink-0 text-ink">{label.label}</span>
      <span className="min-w-0 flex-1 truncate text-caption text-ink-subtle">{label.hint}</span>
      {checked && <SbIcon name="check" size={14} className="text-accent" />}
    </button>
  );
  const toggle = (key: keyof ChatMenuSettings) => {
    const value = !settings[key];
    onSettings({ [key]: value });
    emit({ event: { type: "SETTING_CHANGED", payload: { key: key === "web" ? "web-search" : "deep-research", value } } });
  };
  const attach = () => {
    openPicker();
    emit({ event: { type: "UI_CLICKED", target: "composer.attach", payload: { region: "composer", control: "attach" } } });
  };
  return (
    <div className="flex max-h-80 flex-col overflow-y-auto">
      {item("paperclip", m.files, attach)}
      {item("book", m.library, attach)}
      {item("sparkle", m.image, () => {
        close();
        onDraft(m.imageText);
      })}
      {item("globe", mode === "work" ? m.webWork : m.web, () => toggle("web"), settings.web)}
      {item("folder", m.project, null)}
      {mode === "chat" && item("search", m.research, () => toggle("research"), settings.research)}
      {item("compose", m.draw, null)}
      <div className="my-1 h-px bg-line" />
      <p className="px-2.5 pt-1 pb-1 text-caption text-ink-subtle">{m.plugins}</p>
      {plugins.length === 0 && <p className="px-2.5 py-1.5 text-caption text-ink-subtle">{m.noPlugins}</p>}
      {plugins.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink" data-testid="menu-connector" data-id={p.id}>
          <span className="grid size-5 shrink-0 place-items-center rounded-sm bg-sunken text-[0.6875rem] font-semibold ring-1 ring-line ring-inset" aria-hidden="true">
            {p.label.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex-1 truncate">{p.label}</span>
          <Switch on={p.on} label={format(p.on ? t.connectors.catalog.turnOff : t.connectors.catalog.turnOn, { name: p.label })} onChange={(on) => onTogglePlugin(p.id, on)} />
        </div>
      ))}
      <button
        type="button"
        className={cx(menuItem, "text-ink-muted")}
        onClick={() => {
          close();
          onManagePlugins();
        }}
      >
        <SbIcon name="plug" className="text-ink-subtle" />
        {m.managePlugins}
      </button>
    </div>
  );
}

/** Chat mode: suggestions as quiet rows under the composer. */
export function ChatSuggestions({ setText }: { setText: (s: string) => void }) {
  return (
    <ul className="mt-4 flex flex-col gap-1" data-testid="chat-suggestions">
      {c.suggestions.map((s) => (
        <li key={s.text}>
          <button type="button" onClick={() => setText(s.text)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body-sm text-ink-muted hover:bg-sunken hover:text-ink" aria-label={`${t.chat.useSuggestion}: ${s.text}`}>
            <SbIcon name={s.icon as Icon} className="shrink-0 text-ink-subtle" />
            <span className="truncate">{s.text}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Work mode: the bar under the box (Vælg projekt · Filer · Plugins) and "Se, hvad Work kan". */
export function WorkExtras({ setText, onFiles, onPlugins }: { setText: (s: string) => void; onFiles: () => void; onPlugins: () => void }) {
  const w = c.work;
  const bar = "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-caption text-ink-muted hover:bg-sunken hover:text-ink";
  return (
    <>
      <div className="-mt-2 flex items-center gap-1 rounded-b-2xl border border-t-0 border-line bg-sunken/60 px-3 pt-3.5 pb-1.5" data-testid="work-bar">
        <span className={cx(bar, "cursor-not-allowed opacity-60")} title={c.noProjects}>
          <SbIcon name="folder" size={14} />
          {w.chooseProject}
        </span>
        <button type="button" className={bar} onClick={onFiles}>
          <SbIcon name="book" size={14} />
          {w.files}
        </button>
        <button type="button" className={bar} onClick={onPlugins}>
          <SbIcon name="plug" size={14} />
          {w.plugins}
        </button>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <p className="flex items-center gap-2 text-label text-ink">
          <SbIcon name="bulb" size={14} className="text-accent" />
          {w.showcase}
        </p>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {w.cards.map((k) => (
            <li key={k.title} className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-3.5">
              <span className="flex items-center justify-between gap-2">
                <SbIcon name="sparkle" className="text-accent" />
                <button type="button" onClick={() => setText(k.text)} className="inline-flex h-7 items-center rounded-full border border-line px-2.5 text-caption text-ink hover:bg-sunken" aria-label={`${w.try}: ${k.title}`}>
                  {w.try}
                </button>
              </span>
              <span className="text-label text-ink">{k.title}</span>
              <span className="text-caption text-ink-muted">{k.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* ───────────────────────── Pages ───────────────────────── */

function Page({ title, lead, actions, wide = false, children, testId }: { title: string; lead?: string; actions?: ReactNode; wide?: boolean; children: ReactNode; testId?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surface" data-testid={testId}>
      <div className={cx("mx-auto flex w-full flex-col gap-5 px-4 pt-6 pb-16 sm:px-6", wide ? "max-w-[50rem]" : "max-w-[38rem]")}>
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

function SearchField({ value, onChange, label, testId }: { value: string; onChange: (v: string) => void; label: string; testId?: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <SbIcon name="search" size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} data-testid={testId} className="h-10 w-full rounded-full border border-line bg-surface pr-3 pl-9 text-body-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none" />
    </label>
  );
}

/** Planlagt: ask for a scheduled task, pick when, or start from a recommended one. */
export function PlannedView({ state, emit }: { state: SandboxState; emit: Emit }) {
  const p = c.planned;
  const [text, setText] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [time, setTime] = useState("08:00");
  const [onlyActive, setOnlyActive] = useState(false);
  const [recOpen, setRecOpen] = useState(true);
  const pii = detectPii(text);
  const blockedKind = pii.findings.find((f) => f.severity === "BLOCK")?.kind;
  const list = state.automations.filter((a) => !onlyActive || a.enabled);
  const create = () => {
    if (!text.trim() || blockedKind) return;
    emit({
      event: {
        type: "AUTOMATION_CREATED",
        payload: { automationId: newOverlayId("auto"), trigger: { type: "SCHEDULE", freq: "WEEKLY", weekday, time }, actions: [{ type: "RUN_PROMPT", connectorIds: [] }, { type: "NOTIFY_ME", connectorIds: [] }], promptCharCount: text.length },
      },
      contentText: text,
    });
    setText("");
  };
  const select = "h-8 rounded-md border border-line bg-surface px-2 text-caption text-ink focus:border-accent focus:outline-none";
  return (
    <Page
      title={p.title}
      lead={p.lead}
      testId="sandbox-automations"
      actions={
        <button type="button" aria-pressed={onlyActive} onClick={() => setOnlyActive((v) => !v)} className={cx("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption", onlyActive ? "border-accent/30 bg-accent-soft text-accent-ink" : "border-line text-ink hover:bg-sunken")}>
          <SbIcon name="filter" size={12} />
          {p.active}
        </button>
      }
    >
      <form
        className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="grid size-8 place-items-center text-ink-subtle" aria-hidden="true">
            <SbIcon name="plus" />
          </span>
          <label className="flex-1">
            <span className="sr-only">{p.placeholder}</span>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={8000} placeholder={p.placeholder} className="h-9 w-full bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none" data-testid="planned-input" />
          </label>
          <MicButton />
          <button type="submit" aria-label={p.send} disabled={!text.trim() || Boolean(blockedKind)} className="grid size-8 place-items-center rounded-full bg-accent text-on-accent disabled:opacity-35">
            <SbIcon name="arrowUp" />
          </button>
        </div>
        {text.trim() && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-2 pt-2" data-testid="planned-when">
            <span className="text-caption text-ink-muted">{p.when}</span>
            <label>
              <span className="sr-only">{t.automations.weekday}</span>
              <select className={select} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {t.automations.weekdays.map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{t.automations.time}</span>
              <input type="time" className={select} value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
        )}
        {blockedKind && <p className="px-2 pb-1 text-caption text-danger">{t.pii.blocked[blockedKind]}</p>}
      </form>

      {state.automations.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="px-2 text-label text-ink">{p.yours}</h3>
          <ul className="divide-y divide-line">
            {list.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-2 py-3">
                <SbIcon name="clock" className="text-ink-subtle" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-sm text-ink">{format(t.automations.item, { n: i + 1 })}</span>
                  <span className="text-caption text-ink-subtle">
                    {a.enabled ? t.automations.enabled : t.automations.disabled} · {format(t.automations.testRuns, { n: a.testRuns })}
                  </span>
                </span>
                <button type="button" className="h-7 rounded-full border border-line px-2.5 text-caption text-ink hover:bg-sunken" onClick={() => emit({ event: { type: a.enabled ? "AUTOMATION_DISABLED" : "AUTOMATION_ENABLED", payload: { automationId: a.id } } })}>
                  {a.enabled ? t.automations.disable : t.automations.enable}
                </button>
                <button type="button" className="h-7 rounded-full border border-line px-2.5 text-caption text-ink hover:bg-sunken" onClick={() => emit({ event: { type: "AUTOMATION_TEST_RUN", payload: { automationId: a.id, success: true, actionsRun: a.actionTypes.length } } })}>
                  {t.automations.testRun}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {state.automations.length === 0 && <p className="px-2 text-body-sm text-ink-muted">{p.none}</p>}

      <section className="flex flex-col">
        <button type="button" aria-expanded={recOpen} onClick={() => setRecOpen((o) => !o)} className="inline-flex items-center gap-1 self-start px-2 text-body-sm text-ink-muted hover:text-ink">
          {p.recommended}
          <SbIcon name="chevronDown" size={12} className={cx("transition-transform", !recOpen && "-rotate-90")} />
        </button>
        {recOpen && (
          <ul className="mt-1 divide-y divide-line">
            {p.templates.map((k) => (
              <li key={k.title} className="flex items-center gap-3 px-2 py-3">
                <SbIcon name={k.icon as Icon} className="text-ink-subtle" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-sm text-ink">{k.title}</span>
                  <span className="text-caption text-ink-muted">{k.body}</span>
                </span>
                <button type="button" aria-label={`${t.chat.useSuggestion}: ${k.title}`} className={iconButton} onClick={() => setText(k.text)}>
                  <SbIcon name="plus" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

type LibTab = keyof typeof c.library.tabs;

/** Bibliotek: Nordlys' files as a library with Foreslået / Favoritter / Mapper / Billeder / Alle. */
export function LibraryView({ files, emit, onOpenSheet }: { files: FileItem[]; emit: Emit; onOpenSheet: () => void }) {
  const l = c.library;
  const [tab, setTab] = useState<LibTab>("suggested");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [open, setOpen] = useState<FileItem | null>(null);
  const { open: newOpen, setOpen: setNewOpen, ref: newRef } = usePopover();
  const needle = q.trim().toLocaleLowerCase("da");
  const shown = files.filter((f) => (tab !== "favorites" || favorites.includes(f.id)) && (!needle || `${f.name} ${f.summary}`.toLocaleLowerCase("da").includes(needle)));
  const openFile = (f: FileItem) => {
    if (f.kind === "sheet") return onOpenSheet();
    emit({ event: { type: "FILE_OPENED", payload: { fileId: f.id } } });
    setOpen(f);
  };
  const star = (f: FileItem) => (
    <button
      type="button"
      aria-pressed={favorites.includes(f.id)}
      aria-label={format(favorites.includes(f.id) ? l.unfavorite : l.favorite, { name: f.name })}
      onClick={(e) => {
        e.stopPropagation();
        setFavorites((x) => (x.includes(f.id) ? x.filter((y) => y !== f.id) : [...x, f.id]));
      }}
      className={cx("grid size-7 place-items-center rounded-md hover:bg-sunken", favorites.includes(f.id) ? "text-accent" : "text-ink-subtle")}
    >
      <SbIcon name="star" size={14} />
    </button>
  );

  if (open)
    return (
      <Page title={open.name} lead={open.summary} wide testId="sandbox-files">
        <button type="button" onClick={() => setOpen(null)} className="inline-flex items-center gap-1 self-start text-body-sm text-ink-muted hover:text-ink">
          <SbIcon name="arrowLeft" size={14} />
          {l.back}
        </button>
        <pre className="overflow-x-auto rounded-xl border border-line bg-surface p-5 font-sans text-body leading-relaxed whitespace-pre-wrap text-ink">{open.body}</pre>
      </Page>
    );

  const empty = tab === "favorites" ? l.noFavorites : tab === "folders" ? l.noFolders : tab === "images" ? l.noImages : l.noHits;
  const items = tab === "folders" || tab === "images" ? [] : shown;
  return (
    <Page
      title={l.title}
      wide
      testId="sandbox-files"
      actions={
        <>
          <button type="button" aria-label={l.grid} aria-pressed={view === "grid"} className={cx(iconButton, view === "grid" && "bg-sunken text-ink")} onClick={() => setView("grid")}>
            <SbIcon name="grid" />
          </button>
          <button type="button" aria-label={l.list} aria-pressed={view === "list"} className={cx(iconButton, view === "list" && "bg-sunken text-ink")} onClick={() => setView("list")}>
            <SbIcon name="list" />
          </button>
          <div className="hidden w-48 sm:block">
            <SearchField value={q} onChange={setQ} label={l.search} />
          </div>
          <div ref={newRef} className="relative">
            <button type="button" aria-expanded={newOpen} className={darkButton} onClick={() => setNewOpen((o) => !o)}>
              {l.new}
              <SbIcon name="chevronDown" size={12} />
            </button>
            {newOpen && (
              <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 w-52")}>
                {[l.newFolder, l.upload].map((x) => (
                  <p key={x} className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink-subtle">
                    <SbIcon name={x === l.upload ? "paperclip" : "folder"} />
                    {x}
                  </p>
                ))}
                <p className="px-2.5 pt-1 pb-1 text-caption text-ink-subtle">{l.soon}</p>
              </div>
            )}
          </div>
        </>
      }
    >
      <div className="sm:hidden">
        <SearchField value={q} onChange={setQ} label={l.search} />
      </div>
      <div role="group" aria-label={l.title} className="flex flex-wrap gap-1">
        {(Object.keys(l.tabs) as LibTab[]).map((k) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={cx("h-8 rounded-full px-3 text-body-sm", tab === k ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink")}>
            {l.tabs[k]}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{empty}</p>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((f) => (
            <li key={f.id}>
              <div role="button" tabIndex={0} onClick={() => openFile(f)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openFile(f))} className="flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs transition-shadow hover:shadow-md" data-testid="library-file">
                <span className="flex items-center gap-1.5 px-3 pt-2.5">
                  <SbIcon name={f.kind === "doc" ? "file" : "table"} size={14} className="text-accent" />
                  <span className="min-w-0 flex-1 truncate text-caption font-medium text-ink">{f.name}</span>
                  {star(f)}
                </span>
                <span className="line-clamp-4 px-3 pt-1 pb-3 text-caption text-ink-subtle">{f.summary}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
              <button type="button" onClick={() => openFile(f)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <SbIcon name={f.kind === "doc" ? "file" : "table"} className="text-accent" />
                <span className="truncate text-body-sm text-ink">{f.name}</span>
              </button>
              {star(f)}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

/** Plugins: search, Installerede, Offentlige / Personlige and the directory sections, then Nordlys' industry ones. */
export function PluginsView({ catalog, sections, state, emit, practice, sessionId }: { catalog: CatalogItem[]; sections: { title: string; ids: string[] }[]; state: SandboxState; emit: Emit; practice: PracticeView | null; sessionId: string }) {
  const p = c.plugins;
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"public" | "personal">("public");
  const [section, setSection] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ item: CatalogItem; editing: boolean } | null>(null);
  const byId = new Map(catalog.map((i) => [i.id, i]));
  const installed = catalog.filter((i) => isLinked(state, i.id));
  const needle = q.trim().toLocaleLowerCase("da");
  const card = (i: CatalogItem) => <PluginRow key={i.id} item={i} state={state} onConnect={() => (startConnect(i, emit), setDialog({ item: i, editing: false }))} onEdit={() => setDialog({ item: i, editing: true })} onDisconnect={() => disconnectItem(i, emit)} />;
  const grid = "grid grid-cols-1 gap-x-8 sm:grid-cols-2";

  let body: ReactNode;
  if (needle) {
    const hits = catalog.filter((i) => `${i.name} ${i.description ?? ""}`.toLocaleLowerCase("da").includes(needle));
    body = hits.length ? <ul className={grid}>{hits.map(card)}</ul> : <p className="text-body-sm text-ink-muted">{p.noHits}</p>;
  } else if (scope === "personal") {
    body = <p className="text-body-sm text-ink-muted">{p.noPersonal}</p>;
  } else if (section) {
    const s = sections.find((x) => x.title === section);
    body = (
      <>
        <button type="button" onClick={() => setSection(null)} className="inline-flex items-center gap-1 self-start text-body-sm text-ink-muted hover:text-ink">
          <SbIcon name="arrowLeft" size={14} />
          {p.back}
        </button>
        <h3 className="text-label text-ink">{section}</h3>
        <ul className={grid}>{(s?.ids ?? []).map((id) => byId.get(id)).filter((i): i is CatalogItem => Boolean(i)).map(card)}</ul>
      </>
    );
  } else {
    body = (
      <>
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-1">
            <button type="button" onClick={() => setSection(s.title)} className="inline-flex items-center gap-1 self-start text-label text-ink hover:underline">
              {s.title}
              <SbIcon name="chevronRight" size={14} className="text-ink-subtle" />
            </button>
            <ul className={grid}>{s.ids.slice(0, 6).map((id) => byId.get(id)).filter((i): i is CatalogItem => Boolean(i)).map(card)}</ul>
          </section>
        ))}
        <div className="border-t border-line pt-6">
          <PracticeConnectors practice={practice} layout="GRID" sessionId={sessionId} />
        </div>
      </>
    );
  }

  return (
    <Page title={p.title} lead={p.lead} wide testId="sandbox-connectors">
      <SearchField value={q} onChange={setQ} label={p.search} testId="catalog-search" />
      <section className="flex flex-col gap-2 border-b border-line pb-4" data-testid="plugins-installed">
        <h3 className="text-label text-ink">{p.installed}</h3>
        {installed.length === 0 ? (
          <p className="text-body-sm text-ink-muted">{p.noneInstalled}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {installed.map((i) => (
              <li key={i.id} title={i.name}>
                <Tile size="sm">{i.name.slice(0, 1).toUpperCase()}</Tile>
                <span className="sr-only">{i.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div role="group" aria-label={p.title} className="flex gap-1">
        {(["public", "personal"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)} className={cx("h-8 rounded-full px-3 text-body-sm", scope === k ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink")}>
            {k === "public" ? p.public : p.personal}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-6" data-testid="connector-catalog">
        {body}
      </div>
      {dialog && <ConnectDialog key={dialog.item.id} item={dialog.item} state={state} emit={emit} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </Page>
  );
}

function PluginRow({ item, state, onConnect, onEdit, onDisconnect }: { item: CatalogItem; state: SandboxState; onConnect: () => void; onEdit: () => void; onDisconnect: () => void }) {
  const p = c.plugins;
  const linked = isLinked(state, item.id);
  const { open, setOpen, ref } = usePopover();
  return (
    <li className="flex items-center gap-3 py-2.5" data-testid="catalog-connector" data-id={item.id}>
      <Tile>{item.name.slice(0, 1).toUpperCase()}</Tile>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-medium text-ink">{item.name}</span>
        <span className="truncate text-caption text-ink-muted">
          {item.description}
          {item.data.length > 0 ? ` · ${p.practiceData}` : ""}
        </span>
      </span>
      <div ref={ref} className="relative shrink-0">
        {linked ? (
          <button type="button" aria-expanded={open} aria-label={format(p.options, { name: item.name })} className={iconButton} onClick={() => setOpen((o) => !o)}>
            <SbIcon name="dots" />
          </button>
        ) : (
          <button type="button" aria-label={format(p.add, { name: item.name })} className={iconButton} onClick={onConnect}>
            <SbIcon name="plus" />
          </button>
        )}
        {open && (
          <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 w-44")}>
            {item.data.length > 0 && (
              <button type="button" role="menuitem" className={menuItem} onClick={() => (setOpen(false), onEdit())}>
                {t.connectors.catalog.settings}
              </button>
            )}
            <button type="button" role="menuitem" className={menuItem} onClick={() => (setOpen(false), onDisconnect())}>
              {t.connectors.catalog.disconnect}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Skills: search, Installerede, a few suggested ones, and "Tilføj ▾". */
export function SkillsView({ state, emit, onChat }: { state: SandboxState; emit: Emit; onChat: (text: string) => void }) {
  const s = c.skills;
  const [q, setQ] = useState("");
  const { open, setOpen, ref } = usePopover();
  const installed = state.installed?.skills ?? [];
  const needle = q.trim().toLocaleLowerCase("da");
  const match = (i: { name: string; description: string }) => !needle || `${i.name} ${i.description}`.toLocaleLowerCase("da").includes(needle);
  const mine = s.items.filter((i) => installed.includes(i.id) && match(i));
  const rest = s.items.filter((i) => !installed.includes(i.id) && match(i));
  const toggle = (id: string, on: boolean) => emit({ event: { type: "SETTING_CHANGED", payload: { key: on ? "skill-added" : "skill-removed", value: id } } });
  const line = (i: (typeof s.items)[number], on: boolean) => (
    <li key={i.id} className="flex items-center gap-3 py-2.5" data-testid="skill-item" data-id={i.id}>
      <Tile>
        <SbIcon name="bag" className="text-ink-muted" />
      </Tile>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-medium text-ink">{i.name}</span>
        <span className="truncate text-caption text-ink-muted">{i.description}</span>
      </span>
      <button type="button" aria-label={format(on ? s.remove : s.install, { name: i.name })} className={iconButton} onClick={() => toggle(i.id, !on)}>
        <SbIcon name={on ? "check" : "plus"} className={on ? "text-accent" : ""} />
      </button>
    </li>
  );
  return (
    <Page
      title={s.title}
      lead={s.lead}
      wide
      testId="sandbox-skills"
      actions={
        <div ref={ref} className="relative">
          <button type="button" aria-expanded={open} className={darkButton} onClick={() => setOpen((o) => !o)}>
            {s.add}
            <SbIcon name="chevronDown" size={12} />
          </button>
          {open && (
            <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 w-56")}>
              <button type="button" role="menuitem" className={menuItem} onClick={() => (setOpen(false), onChat(s.chatText))}>
                <SbIcon name="chat" className="text-ink-subtle" />
                {s.addMenu.chat}
              </button>
              {[s.addMenu.editor, s.addMenu.upload].map((x) => (
                <p key={x} className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink-subtle">
                  <SbIcon name={x === s.addMenu.upload ? "paperclip" : "compose"} />
                  <span className="flex-1">{x}</span>
                  <span className="text-caption">{s.soon}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      }
    >
      <SearchField value={q} onChange={setQ} label={s.search} />
      <section className="flex flex-col">
        <h3 className="text-label text-ink">{s.installed}</h3>
        {mine.length ? <ul className="divide-y divide-line">{mine.map((i) => line(i, true))}</ul> : <p className="py-2 text-body-sm text-ink-muted">{s.none}</p>}
      </section>
      {rest.length > 0 && (
        <section className="flex flex-col">
          <h3 className="text-label text-ink">{s.suggested}</h3>
          <ul className="divide-y divide-line">{rest.map((i) => line(i, false))}</ul>
        </section>
      )}
    </Page>
  );
}

/** Plugins | Skills at the top left of those two pages. */
export function PluginTabs({ concept, onTab }: { concept: Concept; onTab: (to: "CONNECTORS" | "SKILLS") => void }) {
  return (
    <div role="group" aria-label={t.terms.plugins} className="flex gap-1">
      {(["CONNECTORS", "SKILLS"] as const).map((k) => (
        <button key={k} type="button" aria-pressed={concept === k} onClick={() => onTab(k)} className={cx("h-8 rounded-full px-3 text-body-sm", concept === k ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink")}>
          {k === "CONNECTORS" ? t.terms.plugins : c.skills.title}
        </button>
      ))}
    </div>
  );
}
