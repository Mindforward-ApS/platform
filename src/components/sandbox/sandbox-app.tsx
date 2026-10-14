"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { cx, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { Concept } from "@/server/sandbox/events";
import type { SandboxState } from "@/server/sandbox/reducer";
import type { NavId } from "@/server/sandbox/skin-schema";
import { postIntent } from "./api";
import { ChatPanel } from "./chat-panel";
import { CONCEPT_ICON, MODEL_CONCEPTS, SbIcon } from "./sandbox-icons";
import type { ChatTurnView, Intent, SandboxProps, TrackLink } from "./types";
import { AssistantsView, AutomationsView, CalendarView, ConnectorsView, CrmView, FilesView, MailView, SheetView, StubView } from "./views";

// Sandbox shell. The skin (data) decides the shell, regions and nav order; look and feel always comes from
// Mindforward's own tokens. Every user action is sent as an intent and becomes a SandboxEvent on the server.

const t = getMessages().sandbox;

export function DisclaimerBar() {
  return (
    <div role="note" className="flex w-full items-center justify-center gap-2 border-b border-line bg-sunken px-4 py-2 text-center text-caption text-ink-muted" data-testid="sandbox-disclaimer">
      <SbIcon name="info" size={14} className="hidden text-ink-subtle sm:block" />
      {t.disclaimer}
    </div>
  );
}

type Pane = "nav" | "content" | "chat";

export function SandboxApp(props: SandboxProps) {
  const { skin, sessionId, world, tracks = [] } = props;
  const [state, setState] = useState<SandboxState>(props.initialState);
  const [concept, setConcept] = useState<Concept>(skin.shell === "APP_RAIL_SIDE_PANEL" ? "MAIL" : "CHAT");
  const [turns, setTurns] = useState<ChatTurnView[]>(props.turns);
  const [conversationId, setConversationId] = useState<string | null>(props.conversationId);
  const [notice, setNotice] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>(skin.shell === "APP_RAIL_SIDE_PANEL" ? "content" : "chat");
  const compact = skin.tokens.density === "compact";

  // Actions are serialized so events reach the server in the order the user made them.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const emit = (intent: Intent) => {
    queue.current = queue.current.then(async () => {
      const r = await postIntent(sessionId, intent);
      if (r.ok) setState(r.state);
      else if (r.error.message) setNotice(r.error.message);
    });
  };

  const navigate = (id: NavId, target: Concept) => {
    emit({ event: { type: "UI_CLICKED", target: `nav.${id}`, payload: { region: "nav", control: id } } });
    emit({ event: { type: "UI_NAVIGATED", payload: { concept: target, view: id } } });
    if (id === "new-chat") {
      setConversationId(null);
      setTurns([]);
    }
    setConcept(target);
    // Phones: jump to what was just opened.
    setPane(target === "CHAT" ? "chat" : "content");
  };

  const reset = () => {
    emit({ event: { type: "SESSION_RESET", payload: { reason: "USER" } } });
    setTurns([]);
    setConversationId(null);
    setNotice(t.resetConfirm);
  };

  const conceptEnabled = (c: Concept) =>
    (c !== "ASSISTANTS" || skin.concepts.assistants) && (c !== "CONNECTORS" || skin.concepts.connectors) && (c !== "AUTOMATIONS" || skin.concepts.automations) && (c !== "AGENTS" || skin.concepts.agents);

  // Keep the skin's order; only split it into the practice model's tools and Nordlys' work systems.
  const items = skin.nav.filter((n) => conceptEnabled(n.concept));
  const groups = [
    { key: "model", label: t.frame.navGroups.model, items: items.filter((n) => MODEL_CONCEPTS.includes(n.concept)) },
    { key: "work", label: t.frame.navGroups.work, items: items.filter((n) => !MODEL_CONCEPTS.includes(n.concept)) },
  ]
    .filter((g) => g.items.length > 0)
    .sort((a, b) => items.indexOf(a.items[0]!) - items.indexOf(b.items[0]!));

  const nav = (
    <nav aria-label={t.frame.navLabel} className="flex flex-col gap-5" data-testid="sandbox-nav">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1.5 text-overline text-ink-subtle uppercase">{g.label}</p>
          {g.items.map((n) => {
            const active = concept === n.concept && n.id !== "new-chat";
            return (
              <button
                key={n.id}
                type="button"
                data-target={`nav.${n.id}`}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex w-full items-center gap-2.5 rounded-sm px-3 text-left text-label transition-colors",
                  compact ? "h-8" : "h-9",
                  active ? "bg-accent-soft text-accent-ink" : "text-ink-muted hover:bg-sunken hover:text-ink",
                )}
                onClick={() => navigate(n.id, n.concept)}
              >
                <SbIcon name={n.id === "new-chat" ? "plus" : CONCEPT_ICON[n.concept]} className={active ? "" : "text-ink-subtle"} />
                <span className="truncate">{t.terms[n.labelKey]}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const history = skin.regions.includes("history") ? (
    <section aria-label={t.terms.history} className="flex flex-col gap-1.5">
      <h2 className="px-3 text-overline text-ink-subtle uppercase">{t.terms.history}</h2>
      {state.chat.conversations === 0 ? (
        <p className="px-3 text-body-sm text-ink-subtle">{t.chat.noHistory}</p>
      ) : (
        <p className="flex items-center gap-2.5 px-3 text-body-sm text-ink-muted">
          <SbIcon name="chat" className="text-ink-subtle" />
          {format(t.chat.conversation, { n: state.chat.conversations })}
        </p>
      )}
    </section>
  ) : null;

  const sidebar = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5 rounded-md border border-line bg-sunken px-3 py-2.5 lg:hidden">
          <p className="text-label text-ink">{t.company}</p>
          <p className="text-body-sm text-ink-muted">{t.youAre}</p>
        </div>
        {nav}
        {history}
      </div>
      <div className="border-t border-line p-3">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2.5 rounded-sm px-3 text-left text-label text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
          onClick={reset}
        >
          <SbIcon name="refresh" className="text-ink-subtle" />
          {t.terms.reset}
        </button>
      </div>
    </div>
  );

  const chat = (
    <ChatPanel
      sessionId={sessionId}
      turns={turns}
      setTurns={setTurns}
      conversationId={conversationId}
      setConversationId={setConversationId}
      files={world.files}
      attachFromFiles={skin.composer.attachFromFiles}
      density={skin.tokens.density}
      emit={emit}
      wide={skin.shell !== "APP_RAIL_SIDE_PANEL"}
    />
  );

  const workspace = (() => {
    switch (concept) {
      case "MAIL":
        return <MailView mail={world.mail} emit={emit} />;
      case "CALENDAR":
        return <CalendarView calendar={world.calendar} emit={emit} />;
      case "FILES":
        return (
          <FilesView
            files={world.files}
            emit={emit}
            onOpenSheet={() => {
              emit({ event: { type: "SHEET_OPENED", payload: { sheetId: "f15" } } });
              setConcept("SHEET");
            }}
          />
        );
      case "CRM":
        return <CrmView crm={world.crm} emit={emit} />;
      case "SHEET":
        return <SheetView cells={world.sheet} />;
      case "CONNECTORS":
        return <ConnectorsView state={state} emit={emit} />;
      case "ASSISTANTS":
        return <AssistantsView state={state} files={world.files} emit={emit} />;
      case "AUTOMATIONS":
        return <AutomationsView state={state} emit={emit} />;
      case "AGENTS":
        return <StubView heading={t.agents.heading} body={t.agents.intro} />;
      case "CHAT":
        return null;
    }
  })();

  // Which regions exist for this shell right now. Phones show one at a time via the pane tabs.
  const showChat = skin.shell !== "SIDEBAR_CHAT" || workspace === null;
  const showContent = skin.shell === "APP_RAIL_SIDE_PANEL" || workspace !== null;
  const contentNode = workspace ?? <StubView heading={t.terms.chat} body={t.chat.empty} />;
  const tabs: Pane[] = ["nav", ...(showContent ? (["content"] as const) : []), ...(showChat ? (["chat"] as const) : [])];
  const activePane: Pane = tabs.includes(pane) ? pane : (tabs[tabs.length - 1] ?? "nav");
  const vis = (p: Pane) => (activePane === p ? "flex" : "hidden lg:flex");

  const sidebarWidth = skin.shell === "APP_RAIL_SIDE_PANEL" ? "lg:w-52" : "lg:w-60";

  return (
    <div
      className="flex h-[calc(100dvh-6.75rem)] min-h-[560px] flex-col bg-bg md:h-[calc(100dvh-4rem)]"
      data-shell={skin.shell}
      data-accent={skin.tokens.accentSlot}
    >
      <DisclaimerBar />
      <header className={cx("h-12 shrink-0 items-center justify-start border-b border-line bg-surface px-4 sm:px-6 lg:flex lg:h-14 lg:justify-between lg:gap-6", tracks.length < 2 ? "hidden" : "flex")}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden size-8 shrink-0 place-items-center rounded-sm bg-accent-soft text-accent-ink lg:grid">
            <SbIcon name="sandbox" />
          </span>
          <h1 className="sr-only text-label whitespace-nowrap text-ink lg:not-sr-only">{t.title}</h1>
          <p className="hidden truncate text-caption text-ink-muted lg:block">
            {t.company} · {t.youAre}
          </p>
        </div>
        <TrackSwitcher tracks={tracks} />
      </header>

      {tabs.length > 1 && (
        <div role="tablist" aria-label={t.frame.panes} className="flex shrink-0 gap-1 border-b border-line bg-surface px-4 py-2 sm:px-6 lg:hidden">
          {tabs.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              id={`sb-tab-${p}`}
              aria-selected={activePane === p}
              aria-controls={`sb-pane-${p}`}
              className={cx(
                "flex h-8 flex-1 items-center justify-center rounded-sm text-label transition-colors",
                activePane === p ? "bg-accent-soft text-accent-ink" : "text-ink-muted hover:bg-sunken hover:text-ink",
              )}
              onClick={() => setPane(p)}
            >
              {t.frame.paneTabs[p]}
            </button>
          ))}
        </div>
      )}

      {notice && (
        <div className="shrink-0 border-b border-line bg-surface px-4 py-3 sm:px-6">
          <Notice>{notice}</Notice>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside id="sb-pane-nav" aria-labelledby="sb-tab-nav" className={cx(vis("nav"), "w-full min-w-0 flex-col border-line bg-surface lg:shrink-0 lg:border-r", sidebarWidth)}>
          {sidebar}
        </aside>

        {skin.shell === "SIDEBAR_CHAT" ? (
          // Sidebar (nav + history) · chat, or the opened surface in its place.
          workspace ? (
            <main id="sb-pane-content" className={cx(vis("content"), "min-h-0 min-w-0 flex-1 flex-col bg-surface")}>
              {workspace}
            </main>
          ) : (
            <main id="sb-pane-chat" className={cx(vis("chat"), "min-h-0 min-w-0 flex-1 flex-col")} aria-label={t.terms.chat}>
              {chat}
            </main>
          )
        ) : skin.shell === "SIDEBAR_CHAT_WORKPANE" ? (
          // Sidebar · chat · work pane that opens for documents, sheets and files.
          <>
            <main id="sb-pane-chat" className={cx(vis("chat"), "min-h-0 min-w-0 flex-1 flex-col lg:min-w-[360px]")} aria-label={t.terms.chat}>
              {chat}
            </main>
            {workspace && (
              <section id="sb-pane-content" aria-label={t.frame.workspace} className={cx(vis("content"), "min-h-0 min-w-0 flex-1 flex-col border-line bg-surface lg:border-l")}>
                {workspace}
              </section>
            )}
          </>
        ) : (
          // Narrow app rail · workspace in the middle · practice model in a side panel next to it.
          <>
            <main id="sb-pane-content" className={cx(vis("content"), "min-h-0 min-w-0 flex-1 flex-col bg-surface")}>
              {contentNode}
            </main>
            <aside id="sb-pane-chat" aria-label={t.modelLabel} className={cx(vis("chat"), "min-h-0 w-full min-w-0 flex-col border-line lg:w-[400px] lg:shrink-0 lg:border-l")}>
              {chat}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

/** Track switcher: plain text links to /sandkasse/<track>. Names come from Track data (descriptive use only). */
function TrackSwitcher({ tracks }: { tracks: TrackLink[] }) {
  if (tracks.length < 2) return null;
  return (
    <nav aria-label={t.frame.tracks} className="flex min-w-0 items-center gap-3">
      <span className="hidden text-caption text-ink-subtle xl:inline">{t.frame.tracks}</span>
      <ul className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-sm bg-sunken p-0.5 ring-1 ring-line ring-inset">
        {tracks.map((tr) => (
          <li key={tr.href} className="shrink-0">
            <Link
              href={tr.href}
              aria-current={tr.current ? "page" : undefined}
              className={cx(
                "flex h-7 items-center rounded-xs px-2.5 text-caption whitespace-nowrap transition-colors",
                tr.current ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:text-ink",
              )}
            >
              {tr.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
