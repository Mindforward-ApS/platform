"use client";

import { useRef, useState } from "react";
import { format, getMessages } from "@/lib/i18n";
import type { Concept } from "@/server/sandbox/events";
import type { SandboxState } from "@/server/sandbox/reducer";
import type { NavId } from "@/server/sandbox/skin-schema";
import { postIntent } from "./api";
import { ChatPanel } from "./chat-panel";
import type { ChatTurnView, Intent, SandboxProps } from "./types";
import { AssistantsView, AutomationsView, CalendarView, ConnectorsView, CrmView, FilesView, MailView, SheetView, StubView } from "./views";

// Sandbox shell. The skin (data) decides the shell, regions and nav order; look and feel always comes from
// Mindforward's own tokens. Every user action is sent as an intent and becomes a SandboxEvent on the server.

const t = getMessages().sandbox;

export function DisclaimerBar() {
  return (
    <div role="note" className="w-full border-b border-border bg-surface px-4 py-2 text-center text-sm" data-testid="sandbox-disclaimer">
      {t.disclaimer}
    </div>
  );
}

export function SandboxApp(props: SandboxProps) {
  const { skin, sessionId, world } = props;
  const [state, setState] = useState<SandboxState>(props.initialState);
  const [concept, setConcept] = useState<Concept>(skin.shell === "APP_RAIL_SIDE_PANEL" ? "MAIL" : "CHAT");
  const [turns, setTurns] = useState<ChatTurnView[]>(props.turns);
  const [conversationId, setConversationId] = useState<string | null>(props.conversationId);
  const [notice, setNotice] = useState<string | null>(null);
  const compact = skin.tokens.density === "compact";
  const gap = compact ? "gap-2" : "gap-4";
  const pad = compact ? "p-2" : "p-4";

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
  };

  const reset = () => {
    emit({ event: { type: "SESSION_RESET", payload: { reason: "USER" } } });
    setTurns([]);
    setConversationId(null);
    setNotice(t.resetConfirm);
  };

  const conceptEnabled = (c: Concept) =>
    (c !== "ASSISTANTS" || skin.concepts.assistants) && (c !== "CONNECTORS" || skin.concepts.connectors) && (c !== "AUTOMATIONS" || skin.concepts.automations) && (c !== "AGENTS" || skin.concepts.agents);

  const nav = (
    <nav aria-label={t.title} className={`flex flex-col ${compact ? "gap-1" : "gap-2"}`} data-testid="sandbox-nav">
      {skin.nav.filter((n) => conceptEnabled(n.concept)).map((n) => (
        <button
          key={n.id}
          type="button"
          data-target={`nav.${n.id}`}
          aria-current={concept === n.concept && n.id !== "new-chat" ? "page" : undefined}
          className={`rounded-md px-3 py-2 text-left ${concept === n.concept && n.id !== "new-chat" ? "bg-accent text-accent-fg" : "border border-border bg-bg"}`}
          onClick={() => navigate(n.id, n.concept)}
        >
          {t.terms[n.labelKey]}
        </button>
      ))}
      <button type="button" className="mt-4 rounded-md border border-border px-3 py-2 text-left text-sm" onClick={reset}>
        {t.terms.reset}
      </button>
    </nav>
  );

  const history = skin.regions.includes("history") ? (
    <section aria-label={t.terms.history} className="flex flex-col gap-1 text-sm">
      <h2 className="font-semibold">{t.terms.history}</h2>
      {state.chat.conversations === 0 ? <p className="text-muted">{t.chat.noHistory}</p> : <p>{format(t.chat.conversation, { n: state.chat.conversations })}</p>}
    </section>
  ) : null;

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

  const noticeBar = notice ? (
    <p role="status" className="rounded-md border border-border p-2 text-sm">
      {notice}
    </p>
  ) : null;

  let body: React.ReactNode;
  if (skin.shell === "APP_RAIL_SIDE_PANEL") {
    // Narrow app rail · workspace in the middle · assistant in a side panel next to it.
    body = (
      <div className={`grid flex-1 grid-cols-1 md:grid-cols-[10rem_1fr_24rem] ${gap} ${pad}`}>
        <aside>{nav}</aside>
        <main className="min-w-0">{workspace ?? <StubView heading={t.terms.chat} body={t.chat.empty} />}</main>
        <aside className="flex min-h-96 flex-col rounded-md border border-border" aria-label={t.modelLabel}>
          {chat}
        </aside>
      </div>
    );
  } else if (skin.shell === "SIDEBAR_CHAT_WORKPANE") {
    // Sidebar (nav + conversations) · chat · work pane that opens for documents, sheets and files.
    body = (
      <div className={`grid flex-1 grid-cols-1 ${workspace ? "md:grid-cols-[14rem_1fr_1fr]" : "md:grid-cols-[14rem_1fr]"} ${gap} ${pad}`}>
        <aside className={`flex flex-col ${gap}`}>
          {nav}
          {history}
        </aside>
        <main className="flex min-h-96 min-w-0 flex-col rounded-md border border-border">{chat}</main>
        {workspace && <section className="min-w-0 rounded-md border border-border p-3">{workspace}</section>}
      </div>
    );
  } else {
    // SIDEBAR_CHAT: sidebar (nav + history) · chat (or the opened surface) with composer at the bottom.
    body = (
      <div className={`grid flex-1 grid-cols-1 md:grid-cols-[14rem_1fr] ${gap} ${pad}`}>
        <aside className={`flex flex-col ${gap}`}>
          {nav}
          {history}
        </aside>
        <main className="flex min-h-96 min-w-0 flex-col">{workspace ? <div className="p-1">{workspace}</div> : chat}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col" data-shell={skin.shell} data-accent={skin.tokens.accentSlot}>
      <DisclaimerBar />
      <header className={`flex flex-wrap items-baseline ${gap} border-b border-border ${pad}`}>
        <h1 className="font-semibold">{t.title}</h1>
        <span className="text-sm text-muted">
          {t.company} · {t.youAre}
        </span>
      </header>
      {noticeBar && <div className={pad}>{noticeBar}</div>}
      {body}
    </div>
  );
}
