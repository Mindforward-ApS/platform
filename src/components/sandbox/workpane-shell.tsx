"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { Concept } from "@/server/sandbox/events";
import type { SandboxState } from "@/server/sandbox/reducer";
import type { NavId, SkinConfig } from "@/server/sandbox/skin-schema";
import { ConnectDialog, disconnectItem, isLinked, startConnect } from "./connector-catalog";
import { CONCEPT_ICON, SbIcon } from "./sandbox-icons";
import type { CatalogItem, CustomizeItem, Intent, PracticeView } from "./types";
import { PracticeConnectors } from "./views";

// The workpane shell in the same structure as the real desktop app it trains for: sidebar (Ny, Søg, Projekter,
// Artefakter, Planlagte, Tilpasning, Mere, Seneste, the user), a start screen with the composer and the row under it,
// and "Tilpasning" with Skills / Forbindelser / Plugins in the main area. Everything stays in this page (no new tabs).
// Look and feel come from Mindforward's tokens; the model is always called Øvemodel.

const t = getMessages().sandbox;
const s = t.shell;
type Emit = (intent: Intent) => void;
export type CustomizeTab = "skills" | "connectors" | "plugins";
const TAB_CONCEPT: Record<CustomizeTab, Concept> = { skills: "SKILLS", connectors: "CONNECTORS", plugins: "PLUGINS" };
export const CUSTOMIZE_CONCEPTS: Concept[] = ["SKILLS", "CONNECTORS", "PLUGINS"];

/** Open/close with outside click and Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const menuBox = "z-30 flex flex-col rounded-xl border border-line bg-surface p-1.5 shadow-lg";
const menuItem = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-body-sm text-ink hover:bg-sunken";

/* ───────────────────────── Sidebar ───────────────────────── */

export function WorkpaneSidebar({
  skin,
  concept,
  conversations,
  activeConversation,
  onNav,
  onReset,
}: {
  skin: SkinConfig;
  concept: Concept;
  conversations: number;
  activeConversation: boolean;
  onNav: (id: NavId, concept: Concept) => void;
  onReset: () => void;
}) {
  const { open: moreOpen, setOpen: setMoreOpen, ref: moreRef } = usePopover();
  const [recentOpen, setRecentOpen] = useState(true);
  const systems = ["MAIL", "CALENDAR", "FILES", "CRM", "SHEET"] as Concept[];
  const primary = skin.nav.filter((n) => !systems.includes(n.concept));
  const work = skin.nav.filter((n) => systems.includes(n.concept));
  const isActive = (c: Concept, id: NavId) => id !== "new-chat" && (c === concept || (c === "SKILLS" && CUSTOMIZE_CONCEPTS.includes(concept)));
  const row = (active: boolean) => cx("flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-body-sm transition-colors", active ? "bg-sunken text-ink" : "text-ink-muted hover:bg-sunken/70 hover:text-ink");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 px-3">
        <span className="text-title-3 text-ink">{t.title}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 pb-3">
        <nav aria-label={t.frame.navLabel} className="flex flex-col gap-px" data-testid="sandbox-nav">
          {primary.map((n) => (
            <button key={n.id} type="button" data-target={`nav.${n.id}`} aria-current={isActive(n.concept, n.id) ? "page" : undefined} className={row(isActive(n.concept, n.id))} onClick={() => onNav(n.id, n.concept)}>
              <SbIcon name={n.id === "new-chat" ? "plus" : n.id === "assistants" ? "folder" : CONCEPT_ICON[n.concept]} />
              <span className="truncate">{t.terms[n.labelKey]}</span>
            </button>
          ))}
          <div ref={moreRef}>
            <button type="button" aria-expanded={moreOpen} className={row(systems.includes(concept))} onClick={() => setMoreOpen((o) => !o)} data-testid="sidebar-more">
              <SbIcon name="dots" />
              <span>{t.terms.more}</span>
            </button>
            {moreOpen && (
              <div role="menu" className={cx(menuBox, "mt-1")}>
                <p className="px-2.5 pt-1.5 pb-1 text-caption text-ink-subtle">{s.systems}</p>
                {work.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    data-target={`nav.${n.id}`}
                    className={menuItem}
                    onClick={() => {
                      setMoreOpen(false);
                      onNav(n.id, n.concept);
                    }}
                  >
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
                    setMoreOpen(false);
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

        <section aria-label={s.recent} className="flex flex-col gap-px">
          <button type="button" aria-expanded={recentOpen} onClick={() => setRecentOpen((o) => !o)} className="flex h-7 items-center gap-1 px-2.5 text-caption text-ink-subtle hover:text-ink">
            {s.recent}
            <SbIcon name="chevronDown" size={12} className={cx("transition-transform", !recentOpen && "-rotate-90")} />
          </button>
          {recentOpen &&
            (conversations === 0 ? (
              <p className="px-2.5 py-1 text-body-sm text-ink-subtle">{t.chat.noHistory}</p>
            ) : (
              Array.from({ length: Math.min(conversations, 12) }, (_, i) => conversations - i).map((n, i) =>
                i === 0 && activeConversation ? (
                  <button key={n} type="button" className={row(concept === "CHAT")} onClick={() => onNav("chat", "CHAT")}>
                    <span className="truncate">{format(t.chat.conversation, { n })}</span>
                  </button>
                ) : (
                  <p key={n} className="flex h-8 items-center px-2.5 text-body-sm text-ink-subtle">
                    <span className="truncate">{format(t.chat.conversation, { n })}</span>
                  </p>
                ),
              )
            ))}
        </section>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 border-t border-line px-3 py-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-caption font-semibold text-on-accent">{t.frame.userInitials}</span>
        <span className="min-w-0 flex-1 truncate text-body-sm text-ink">
          {t.frame.user} <span className="text-ink-subtle">· {s.plan}</span>
        </span>
        <button type="button" aria-label={t.terms.reset} title={t.terms.reset} className="grid size-7 place-items-center rounded-md text-ink-subtle hover:bg-sunken hover:text-ink" onClick={onReset}>
          <SbIcon name="refresh" size={14} />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Composer parts ───────────────────────── */

export interface ComposerSettings {
  research: boolean;
  memory: boolean;
  effort: keyof typeof s.efforts;
}

function Flyout({ label, icon, children }: { label: string; icon: Parameters<typeof SbIcon>[0]["name"]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-expanded={open} className={menuItem} onClick={() => setOpen((o) => !o)}>
        <SbIcon name={icon} className="text-ink-subtle" />
        <span className="flex-1">{label}</span>
        <SbIcon name="chevronRight" size={14} className="text-ink-subtle" />
      </button>
      {open && <div className={cx(menuBox, "w-64 max-sm:static max-sm:mt-1 max-sm:shadow-none sm:absolute sm:top-0 sm:left-full sm:ml-1")}>{children}</div>}
    </div>
  );
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-line-strong")}>
      <span className={cx("absolute top-0.5 size-4 rounded-full bg-surface transition-all", on ? "left-[1.125rem]" : "left-0.5")} />
    </button>
  );
}

/** Content of the composer's "+" menu, in the real app's order. */
export function ComposerMenu({
  close,
  openPicker,
  attachFromFiles,
  connectors,
  onToggleConnector,
  skills,
  plugins,
  settings,
  onSettings,
  onOpenCustomize,
  emit,
}: {
  close: () => void;
  openPicker: () => void;
  attachFromFiles: boolean;
  connectors: { id: string; label: string; on: boolean }[];
  onToggleConnector: (id: string, on: boolean) => void;
  skills: CustomizeItem[];
  plugins: CustomizeItem[];
  settings: ComposerSettings;
  onSettings: (next: Partial<ComposerSettings>) => void;
  onOpenCustomize: (tab: CustomizeTab) => void;
  emit: Emit;
}) {
  const list = (items: CustomizeItem[], none: string, manage: string, tab: CustomizeTab) => (
    <>
      {items.length === 0 && <p className="px-2.5 py-1.5 text-caption text-ink-subtle">{none}</p>}
      {items.map((i) => (
        <p key={i.id} className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink">
          <SbIcon name={i.icon} className="text-ink-subtle" />
          <span className="truncate">{i.name}</span>
        </p>
      ))}
      <div className="my-1 h-px bg-line" />
      <button
        type="button"
        className={cx(menuItem, "text-ink-muted")}
        onClick={() => {
          close();
          onOpenCustomize(tab);
        }}
      >
        <SbIcon name="bag" className="text-ink-subtle" />
        {manage}
      </button>
    </>
  );
  const toggle = (key: "research" | "memory") => {
    const value = !settings[key];
    onSettings({ [key]: value });
    emit({ event: { type: "SETTING_CHANGED", payload: { key, value } } });
  };
  return (
    <>
      {attachFromFiles && (
        <button
          type="button"
          className={menuItem}
          onClick={() => {
            openPicker();
            emit({ event: { type: "UI_CLICKED", target: "composer.attach", payload: { region: "composer", control: "attach" } } });
          }}
        >
          <SbIcon name="paperclip" className="text-ink-subtle" />
          {s.menu.upload}
        </button>
      )}
      <Flyout label={s.menu.skills} icon="bag">
        {list(skills, s.menu.noSkills, s.menu.manageSkills, "skills")}
      </Flyout>
      <Flyout label={s.menu.connectors} icon="plug">
        <p className="px-2.5 pt-1.5 pb-1 text-caption text-ink-subtle">{t.connectors.catalog.inChatTitle}</p>
        {connectors.length === 0 && <p className="px-2.5 py-1.5 text-caption text-ink-subtle">{t.connectors.catalog.noneConnected}</p>}
        {connectors.map((c) => (
          <div key={c.id} className="flex items-center gap-2.5 px-2.5 py-1.5 text-body-sm text-ink" data-testid="menu-connector" data-id={c.id}>
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-sunken text-caption font-semibold ring-1 ring-line ring-inset" aria-hidden="true">
              {c.label.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex-1 truncate">{c.label}</span>
            <Switch on={c.on} label={format(c.on ? t.connectors.catalog.turnOff : t.connectors.catalog.turnOn, { name: c.label })} onChange={(on) => onToggleConnector(c.id, on)} />
          </div>
        ))}
        <div className="my-1 h-px bg-line" />
        <button
          type="button"
          className={cx(menuItem, "text-ink-muted")}
          onClick={() => {
            close();
            onOpenCustomize("connectors");
          }}
        >
          <SbIcon name="apps" className="text-ink-subtle" />
          {t.connectors.catalog.manage}
        </button>
      </Flyout>
      <Flyout label={s.menu.plugins} icon="bag">
        {list(plugins, s.menu.noPlugins, s.menu.managePlugins, "plugins")}
      </Flyout>
      <div className="my-1 h-px bg-line" />
      {(["research", "memory"] as const).map((k) => (
        <button key={k} type="button" role="menuitemcheckbox" aria-checked={settings[k]} className={menuItem} onClick={() => toggle(k)}>
          <SbIcon name={k === "research" ? "globe" : "memory"} className="text-ink-subtle" />
          <span className="flex-1">{s.menu[k]}</span>
          {settings[k] && <SbIcon name="check" size={14} className="text-accent" />}
        </button>
      ))}
    </>
  );
}

/** Microphone and voice next to send (practice only: nothing is recorded). */
export function ComposerTools() {
  return (
    <>
      <span className="grid size-8 place-items-center rounded-md text-ink-subtle" title={s.voice} aria-hidden="true">
        <SbIcon name="mic" />
      </span>
      <span className="grid size-8 place-items-center rounded-md text-ink-subtle" aria-hidden="true">
        <SbIcon name="wave" />
      </span>
    </>
  );
}

/** The row under the composer: Projekt ▾ on the left, the model with its effort and the mode on the right. */
export function ComposerRow({ projects, settings, onSettings, onNewProject, emit }: { projects: number; settings: ComposerSettings; onSettings: (next: Partial<ComposerSettings>) => void; onNewProject: () => void; emit: Emit }) {
  const { open: projectOpen, setOpen: setProjectOpen, ref: projectRef } = usePopover();
  const { open: modelOpen, setOpen: setModelOpen, ref: modelRef } = usePopover();
  const [chosen, setChosen] = useState<number | null>(null);
  const button = "inline-flex h-8 items-center gap-1 rounded-md px-2 text-body-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink";
  return (
    <div className="flex items-center gap-1 px-1" data-testid="composer-row">
      <div ref={projectRef} className="relative">
        <button type="button" aria-expanded={projectOpen} className={button} onClick={() => setProjectOpen((o) => !o)}>
          {chosen === null ? s.project : format(t.assistants.created, { n: chosen })}
          <SbIcon name="chevronDown" size={12} />
        </button>
        {projectOpen && (
          <div role="menu" className={cx(menuBox, "absolute top-full left-0 mt-1 w-56")}>
            {[null, ...Array.from({ length: projects }, (_, i) => i + 1)].map((n) => (
              <button
                key={n ?? "none"}
                type="button"
                role="menuitemradio"
                aria-checked={chosen === n}
                className={menuItem}
                onClick={() => {
                  setChosen(n);
                  setProjectOpen(false);
                }}
              >
                <SbIcon name="folder" className="text-ink-subtle" />
                <span className="flex-1">{n === null ? s.noProject : format(t.assistants.created, { n })}</span>
                {chosen === n && <SbIcon name="check" size={14} className="text-accent" />}
              </button>
            ))}
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              className={cx(menuItem, "text-ink-muted")}
              onClick={() => {
                setProjectOpen(false);
                onNewProject();
              }}
            >
              <SbIcon name="plus" className="text-ink-subtle" />
              {s.newProject}
            </button>
          </div>
        )}
      </div>
      <div ref={modelRef} className="relative ml-auto">
        <button type="button" aria-expanded={modelOpen} className={button} onClick={() => setModelOpen((o) => !o)} data-testid="model-button">
          <span className="text-ink">{t.modelLabel}</span>
          <span>{s.efforts[settings.effort]}</span>
        </button>
        {modelOpen && (
          <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 w-64")}>
            <p className="flex items-start gap-2.5 px-2.5 py-1.5">
              <span className="flex flex-1 flex-col">
                <span className="text-body-sm text-ink">{t.modelLabel}</span>
                <span className="text-caption text-ink-subtle">{s.modelHint}</span>
              </span>
              <SbIcon name="check" size={14} className="mt-1 text-accent" />
            </p>
            <div className="my-1 h-px bg-line" />
            <p className="px-2.5 pt-1 pb-0.5 text-caption text-ink-subtle">{s.effort}</p>
            {(Object.keys(s.efforts) as ComposerSettings["effort"][]).map((k) => (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={settings.effort === k}
                className={menuItem}
                onClick={() => {
                  onSettings({ effort: k });
                  emit({ event: { type: "SETTING_CHANGED", payload: { key: "effort", value: k } } });
                  setModelOpen(false);
                }}
              >
                <span className="flex-1">{s.efforts[k]}</span>
                {settings.effort === k && <SbIcon name="check" size={14} className="text-accent" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="inline-flex h-8 items-center px-2 text-body-sm text-ink">{s.mode}</span>
    </div>
  );
}

/* ───────────────────────── Pages ───────────────────────── */

function Page({ title, actions, children, testId }: { title: string; actions?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-bg" data-testid={testId}>
      <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-5 px-4 pt-6 pb-16 sm:px-6 lg:pt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-title-2 text-ink">{title}</h2>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Segmented<K extends string>({ items, value, onChange, label }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-0.5">
      {items.map((i) => (
        <button key={i.key} type="button" aria-pressed={value === i.key} onClick={() => onChange(i.key)} className={cx("h-8 rounded-md px-2.5 text-body-sm transition-colors", value === i.key ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink")}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

const darkButton = "inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 text-body-sm font-medium text-surface hover:opacity-90";
const iconButton = "grid size-8 place-items-center rounded-md text-ink-muted hover:bg-sunken hover:text-ink";
const card = "flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5";

function Tile({ children }: { children: ReactNode }) {
  return <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sunken text-label text-ink ring-1 ring-line ring-inset">{children}</span>;
}

function SectionHead({ title, count, onAll }: { title: string; count?: number; onAll?: () => void }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <h3 className="text-label text-ink">{title}</h3>
      {count !== undefined && <span className="rounded-sm bg-sunken px-1.5 text-caption text-ink-subtle">{count}</span>}
      {onAll && (
        <button type="button" onClick={onAll} className="ml-auto inline-flex items-center gap-1 text-body-sm text-ink-muted hover:text-ink">
          {s.customize.viewAll}
          <SbIcon name="arrowRight" size={14} />
        </button>
      )}
    </div>
  );
}

function ItemCard({ item, added, onTry, onToggle }: { item: CustomizeItem; added: boolean; onTry: () => void; onToggle: () => void }) {
  const c = s.customize;
  return (
    <li className={card} data-testid="customize-item" data-id={item.id}>
      <Tile>
        <SbIcon name={item.icon} className="text-ink-muted" />
      </Tile>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label text-ink">{item.name}</span>
        <span className="line-clamp-2 text-caption text-ink-muted">{item.description}</span>
        <span className="text-caption text-ink-subtle">{format(c.by, { name: item.madeBy })}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onTry} className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-caption text-ink hover:bg-sunken" aria-label={`${c.try}: ${item.name}`}>
          <SbIcon name="chat" size={12} />
          {c.try}
        </button>
        <button type="button" onClick={onToggle} aria-label={format(added ? c.remove : c.addItem, { name: item.name })} aria-pressed={added} className={cx("grid size-7 place-items-center rounded-md border", added ? "border-accent/30 bg-accent-soft text-accent-ink" : "border-line text-ink-muted hover:bg-sunken hover:text-ink")}>
          <SbIcon name={added ? "check" : "plus"} size={14} />
        </button>
      </div>
    </li>
  );
}

function ConnectorCard({ item, state, onConnect, onEdit, onDisconnect }: { item: CatalogItem; state: SandboxState; onConnect: () => void; onEdit: () => void; onDisconnect: () => void }) {
  const c = t.connectors.catalog;
  const linked = isLinked(state, item.id);
  const { open: menuOpen, setOpen: setMenuOpen, ref: menuRef } = usePopover();
  return (
    <li className={card} data-testid="catalog-connector" data-id={item.id}>
      <Tile>{item.name.slice(0, 1).toUpperCase()}</Tile>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label text-ink">{item.name}</span>
        <span className="line-clamp-2 text-caption text-ink-muted">
          {item.categories.join(" · ")}
          {item.data.length > 0 ? ` · ${c.practiceData}` : ""}
        </span>
        <span className="text-caption text-ink-subtle">{format(s.customize.by, { name: item.madeBy })}</span>
      </div>
      <div ref={menuRef} className="relative shrink-0">
        {linked ? (
          <button type="button" aria-expanded={menuOpen} aria-label={`${c.connectedBadge}: ${item.name}`} onClick={() => setMenuOpen((o) => !o)} className="grid size-7 place-items-center rounded-md border border-accent/30 bg-accent-soft text-accent-ink">
            <SbIcon name="check" size={14} />
          </button>
        ) : (
          <button type="button" aria-label={`${c.connect} ${item.name}`} onClick={onConnect} className="grid size-7 place-items-center rounded-md border border-line text-ink-muted hover:bg-sunken hover:text-ink">
            <SbIcon name="plus" size={14} />
          </button>
        )}
        {menuOpen && (
          <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 w-44")}>
            {item.data.length > 0 && (
              <button
                type="button"
                role="menuitem"
                className={menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                {c.settings}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={() => {
                setMenuOpen(false);
                onDisconnect();
              }}
            >
              {c.disconnect}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

const PAGE = 30;
const grid = "grid grid-cols-1 gap-2.5 sm:grid-cols-2";

/** Tilpasning: Skills / Forbindelser / Plugins in the main area, with Dine / Udforsk, search, filter, sort and Tilføj. */
export function CustomizeView({
  tab,
  onTab,
  state,
  emit,
  catalog,
  customize,
  practice,
  sessionId,
  onTry,
}: {
  tab: CustomizeTab;
  onTab: (tab: CustomizeTab) => void;
  state: SandboxState;
  emit: Emit;
  catalog: CatalogItem[];
  customize: { skills: CustomizeItem[]; plugins: CustomizeItem[] };
  practice: PracticeView | null;
  sessionId: string;
  onTry: (text: string) => void;
}) {
  const c = s.customize;
  const [scope, setScope] = useState<"yours" | "explore">("explore");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [az, setAz] = useState(false);
  const [all, setAll] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [dialog, setDialog] = useState<{ item: CatalogItem; editing: boolean } | null>(null);
  const { open: filterMenuOpen, setOpen: setFilterMenuOpen, ref: filterMenuRef } = usePopover();
  const { open: sortMenuOpen, setOpen: setSortMenuOpen, ref: sortMenuRef } = usePopover();
  const { open: addMenuOpen, setOpen: setAddMenuOpen, ref: addMenuRef } = usePopover();

  const reset = () => {
    setQ("");
    setFilter(null);
    setAll(null);
    setLimit(PAGE);
  };
  const switchTab = (k: CustomizeTab) => {
    reset();
    onTab(k);
  };

  const kind = tab === "skills" ? "skills" : "plugins";
  const items = useMemo(() => (tab === "connectors" ? [] : customize[kind]), [tab, customize, kind]);
  const installed = (tab === "connectors" ? [] : state.installed?.[kind]) ?? [];
  const facets = useMemo(() => {
    if (tab !== "connectors") return [...new Set(items.map((i) => i.madeBy))];
    const n = new Map<string, number>();
    for (const i of catalog) for (const k of i.categories) n.set(k, (n.get(k) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);
  }, [tab, items, catalog]);

  const needle = q.trim().toLocaleLowerCase("da");
  const sortBy = <T extends { name: string }>(list: T[]) => (az ? [...list].sort((a, b) => a.name.localeCompare(b.name, "da")) : list);
  const toggleItem = (i: CustomizeItem) => {
    const added = installed.includes(i.id);
    emit({ event: { type: "SETTING_CHANGED", payload: { key: `${kind === "skills" ? "skill" : "plugin"}-${added ? "removed" : "added"}`, value: i.id } } });
  };
  const itemCard = (i: CustomizeItem) => <ItemCard key={i.id} item={i} added={installed.includes(i.id)} onToggle={() => toggleItem(i)} onTry={() => onTry(format(c.tryText, { name: i.name }))} />;
  const connectorCard = (i: CatalogItem) => (
    <ConnectorCard
      key={i.id}
      item={i}
      state={state}
      onConnect={() => {
        startConnect(i, emit);
        setDialog({ item: i, editing: false });
      }}
      onEdit={() => setDialog({ item: i, editing: true })}
      onDisconnect={() => disconnectItem(i, emit)}
    />
  );
  const empty = (text: string) => (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong/60 bg-surface p-6">
      <p className="text-body-sm text-ink-muted">{text}</p>
      <button type="button" className={darkButton} onClick={() => setScope("explore")}>
        {c.goExplore}
      </button>
    </div>
  );

  let body: ReactNode;
  if (tab === "connectors") {
    const matches = catalog.filter((i) => (!filter || i.categories.includes(filter)) && (!needle || `${i.name} ${i.madeBy}`.toLocaleLowerCase("da").includes(needle)));
    if (scope === "yours") {
      const mine = sortBy(matches.filter((i) => isLinked(state, i.id)));
      body = mine.length ? <ul className={grid}>{mine.map(connectorCard)}</ul> : empty(c.emptyYours.connectors);
    } else if (needle || filter || all) {
      const list = sortBy(all === "popular" && !needle && !filter ? matches.filter((i) => i.featured > 0).sort((a, b) => a.featured - b.featured) : matches);
      body = (
        <>
          <SectionHead title={all === "popular" ? c.connectorSections.popular : c.connectorSections.rest} count={list.length} />
          {list.length ? <ul className={grid}>{list.slice(0, limit).map(connectorCard)}</ul> : <p className="text-body-sm text-ink-muted">{c.noResults}</p>}
          {list.length > limit && (
            <button type="button" className="self-start text-body-sm text-ink-muted underline underline-offset-4 hover:text-ink" onClick={() => setLimit((l) => l + PAGE)}>
              {t.connectors.catalog.showMore}
            </button>
          )}
        </>
      );
    } else {
      const popular = sortBy(catalog.filter((i) => i.featured > 0).sort((a, b) => a.featured - b.featured));
      const rest = sortBy(catalog.filter((i) => i.featured === 0));
      body = (
        <>
          <Banner label={c.featured} title={t.connectors.heading} text={t.connectors.catalog.lead} icon="plug" />
          <SectionHead title={c.connectorSections.popular} count={popular.length} onAll={() => setAll("popular")} />
          <ul className={grid}>{popular.slice(0, 10).map(connectorCard)}</ul>
          <SectionHead title={c.connectorSections.rest} count={rest.length} onAll={() => setAll("rest")} />
          <ul className={grid}>{rest.slice(0, 6).map(connectorCard)}</ul>
          <div className="border-t border-line pt-6">
            <PracticeConnectors practice={practice} layout="GRID" sessionId={sessionId} />
          </div>
        </>
      );
    }
  } else {
    const matches = items.filter((i) => (!filter || i.madeBy === filter) && (!needle || `${i.name} ${i.description} ${i.madeBy}`.toLocaleLowerCase("da").includes(needle)));
    const label = c.tabs[tab];
    if (scope === "yours") {
      const mine = sortBy(matches.filter((i) => installed.includes(i.id)));
      body = mine.length ? <ul className={grid}>{mine.map(itemCard)}</ul> : empty(c.emptyYours[kind]);
    } else if (needle || filter || all) {
      const list = sortBy(all && !needle && !filter ? matches.filter((i) => i.section === all) : matches);
      body = (
        <>
          {all && !needle && !filter && <SectionHead title={format(c.sections[all as "new" | "popular"], { kind: label })} />}
          {list.length ? <ul className={grid}>{list.map(itemCard)}</ul> : <p className="text-body-sm text-ink-muted">{c.noResults}</p>}
        </>
      );
    } else {
      const featured = items.find((i) => i.section === "forYou");
      body = (
        <>
          {featured && <Banner label={c.featured} title={featured.name} text={featured.description} icon={featured.icon} action={{ label: installed.includes(featured.id) ? format(c.added, { name: featured.name }) : c.add, onClick: () => !installed.includes(featured.id) && toggleItem(featured) }} />}
          <SectionHead title={c.sections.forYou} />
          <ul className={grid}>{sortBy(items.filter((i) => i.section === "forYou")).map(itemCard)}</ul>
          <SectionHead title={format(c.sections.new, { kind: label })} onAll={() => setAll("new")} />
          <ul className={grid}>{sortBy(items.filter((i) => i.section === "new")).slice(0, 6).map(itemCard)}</ul>
          <SectionHead title={format(c.sections.popular, { kind: label })} onAll={() => setAll("popular")} />
          <ul className={grid}>{sortBy(items.filter((i) => i.section === "popular")).slice(0, 6).map(itemCard)}</ul>
        </>
      );
    }
  }

  return (
    <Page title={c.title} testId="sandbox-customize">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2" data-testid="customize-toolbar">
        <Segmented label={c.title} value={tab} onChange={switchTab} items={(["skills", "connectors", "plugins"] as const).map((k) => ({ key: k, label: c.tabs[k] }))} />
        <span className="h-5 w-px bg-line" aria-hidden="true" />
        <Segmented
          label={`${c.yours} / ${c.explore}`}
          value={scope}
          onChange={(k) => {
            setAll(null);
            setScope(k);
          }}
          items={[
            { key: "yours" as const, label: c.yours },
            { key: "explore" as const, label: c.explore },
          ]}
        />
        <div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
          <label className="relative min-w-0 flex-1 sm:w-28 sm:flex-none">
            <span className="sr-only">{c.search}</span>
            <SbIcon name="search" size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder={c.search}
              className="h-8 w-full rounded-md border border-line bg-surface pr-2 pl-8 text-body-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
              data-testid="catalog-search"
            />
          </label>
          <div ref={filterMenuRef} className="relative">
            <button type="button" aria-label={c.filter} aria-expanded={filterMenuOpen} className={cx(iconButton, filter && "text-accent")} onClick={() => setFilterMenuOpen((o) => !o)}>
              <SbIcon name="filter" />
            </button>
            {filterMenuOpen && (
              <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 max-h-72 w-56 overflow-y-auto")}>
                {[null, ...facets].map((f) => (
                  <button
                    key={f ?? "all"}
                    type="button"
                    role="menuitemradio"
                    aria-checked={filter === f}
                    className={menuItem}
                    onClick={() => {
                      setFilter(f);
                      setLimit(PAGE);
                      setFilterMenuOpen(false);
                    }}
                  >
                    <span className="flex-1 truncate">{f ?? t.connectors.catalog.all}</span>
                    {filter === f && <SbIcon name="check" size={14} className="text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div ref={sortMenuRef} className="relative">
            <button type="button" aria-label={c.sort} aria-expanded={sortMenuOpen} className={iconButton} onClick={() => setSortMenuOpen((o) => !o)}>
              <SbIcon name="sort" />
            </button>
            {sortMenuOpen && (
              <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 w-44")}>
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    role="menuitemradio"
                    aria-checked={az === v}
                    className={menuItem}
                    onClick={() => {
                      setAz(v);
                      setSortMenuOpen(false);
                    }}
                  >
                    <span className="flex-1">{v ? "A–Å" : c.featured}</span>
                    {az === v && <SbIcon name="check" size={14} className="text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div ref={addMenuRef} className="relative">
            <button type="button" aria-expanded={addMenuOpen} className={darkButton} onClick={() => setAddMenuOpen((o) => !o)}>
              <SbIcon name="plus" size={14} />
              {c.add}
              <SbIcon name="chevronDown" size={12} />
            </button>
            {addMenuOpen && (
              <div role="menu" className={cx(menuBox, "absolute top-full right-0 mt-1 w-64")}>
                {(["skill", "connector", "plugin"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="menuitem"
                    className={menuItem}
                    onClick={() => {
                      setAddMenuOpen(false);
                      switchTab(k === "skill" ? "skills" : k === "plugin" ? "plugins" : "connectors");
                      setScope("explore");
                    }}
                  >
                    <SbIcon name={k === "connector" ? "plug" : "bag"} className="text-ink-subtle" />
                    {c.addMenu[k]}
                  </button>
                ))}
                <p className="px-2.5 pt-1.5 pb-1 text-caption text-ink-subtle">{c.buildSoon}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {all && !needle && !filter && scope === "explore" && (
        <button type="button" onClick={() => setAll(null)} className="inline-flex items-center gap-1 self-start text-body-sm text-ink-muted hover:text-ink">
          <SbIcon name="arrowLeft" size={14} />
          {c.back}
        </button>
      )}
      <div className="flex flex-col gap-3" data-testid={tab === "connectors" ? "connector-catalog" : `customize-${tab}`}>
        {body}
      </div>
      {dialog && <ConnectDialog key={dialog.item.id} item={dialog.item} state={state} emit={emit} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </Page>
  );
}

function Banner({ label, title, text, icon = "bag", action }: { label: string; title: string; text: string; icon?: Parameters<typeof SbIcon>[0]["name"]; action?: { label: string; onClick: () => void } }) {
  return (
    <section className="relative flex flex-col items-start gap-1.5 overflow-hidden rounded-xl bg-accent-soft px-5 py-6 sm:px-6">
      <span className="text-caption text-accent-ink">{label}</span>
      <p className="text-title-2 text-ink">{title}</p>
      <p className="max-w-md text-body-sm text-ink-muted">{text}</p>
      {action && (
        <button type="button" className={cx(darkButton, "mt-2 h-7 px-2.5 text-caption")} onClick={action.onClick}>
          {action.label}
        </button>
      )}
      <SbIcon name={icon} size={88} className="pointer-events-none absolute top-1/2 right-8 hidden -translate-y-1/2 text-accent/25 sm:block" />
    </section>
  );
}

export function SearchView({ conversations, activeConversation, onOpen }: { conversations: number; activeConversation: boolean; onOpen: () => void }) {
  const c = s.search;
  const [q, setQ] = useState("");
  const all = Array.from({ length: conversations }, (_, i) => conversations - i);
  const hits = all.filter((n) => !q.trim() || format(c.chat, { n }).toLocaleLowerCase("da").includes(q.trim().toLocaleLowerCase("da")));
  return (
    <Page title={c.title} testId="sandbox-search">
      <label className="relative block">
        <span className="sr-only">{c.placeholder}</span>
        <SbIcon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle" />
        <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.placeholder} className="h-11 w-full rounded-xl border border-line bg-surface pr-3 pl-10 text-body text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none" />
      </label>
      {conversations === 0 ? (
        <p className="text-body-sm text-ink-muted">{c.empty}</p>
      ) : hits.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{c.noHit}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {hits.map((n, i) => (
            <li key={n}>
              {i === 0 && activeConversation && !q.trim() ? (
                <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left text-body-sm text-ink hover:bg-sunken">
                  <SbIcon name="chat" className="text-ink-subtle" />
                  {format(c.chat, { n })}
                </button>
              ) : (
                <p className="flex items-center gap-3 px-4 py-3 text-body-sm text-ink-muted">
                  <SbIcon name="chat" className="text-ink-subtle" />
                  {format(c.chat, { n })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export function ArtifactsView({ created, onMake }: { created: number; onMake: (text: string) => void }) {
  const c = s.artifacts;
  const [tab, setTab] = useState<"all" | "yours" | "shared">("all");
  const kinds = ["docs", "slides", "design", "dashboard"] as const;
  const icon = { docs: "file", slides: "grid", design: "sparkle", dashboard: "chart" } as const;
  return (
    <Page title={c.title} testId="sandbox-artifacts">
      <Segmented label={c.title} value={tab} onChange={setTab} items={(["all", "yours", "shared"] as const).map((k) => ({ key: k, label: c.tabs[k] }))} />
      <div className="flex flex-col gap-2">
        <p className="text-caption text-ink-subtle">{c.makeNew}</p>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {kinds.map((k) => (
            <li key={k}>
              <button type="button" onClick={() => onMake(c.startText[k])} className="flex w-full flex-col gap-2 text-left">
                <span className="grid h-20 w-full place-items-center rounded-xl bg-accent-soft text-accent-ink ring-1 ring-line ring-inset transition-shadow hover:shadow-md">
                  <SbIcon name={icon[k]} size={28} />
                </span>
                <span className="text-body-sm text-ink">{c.kinds[k]}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {tab === "shared" || created === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong/60 bg-surface p-6 text-body-sm text-ink-muted">{c.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {Array.from({ length: created }, (_, i) => (
            <li key={i} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
              <span className="grid h-24 place-items-center bg-sunken text-ink-subtle">
                <SbIcon name="file" size={28} />
              </span>
              <span className="flex items-center gap-2 px-3 py-2.5 text-body-sm text-ink">
                <SbIcon name="file" size={14} className="text-ink-subtle" />
                {format(c.item, { n: i + 1 })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

export { TAB_CONCEPT };
