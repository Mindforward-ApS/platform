"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Badge, Button, cx, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { detectPii, type PiiKind } from "@/lib/pii";
import { newOverlayId, streamChat } from "./api";
import { SbIcon } from "./sandbox-icons";
import type { ChatTurnView, FileItem, Intent } from "./types";

const t = getMessages().sandbox;
const MAX_CHARS = 4000;
const nf = new Intl.NumberFormat("da-DK");
const noSubscribe = () => () => undefined;

/** Neutral avatar for Øvemodel's answers (no brand mark inside the øvemiljø). */
function ModelAvatar({ size }: { size: "sm" | "md" }) {
  return (
    <span aria-hidden="true" className={cx("grid place-items-center rounded-full bg-accent-soft text-accent", size === "sm" ? "size-5" : "size-7")}>
      <SbIcon name="sparkle" size={size === "sm" ? 12 : 15} />
    </span>
  );
}
/** Time-of-day greeting (client only; the server renders the neutral one). */
function clientGreeting(): string {
  const h = new Date().getHours();
  const key = h < 10 ? "morning" : h < 18 ? "afternoon" : "evening";
  return format(t.chat.greeting[key], { name: t.chat.persona });
}

interface Props {
  sessionId: string;
  /** Opgavevisning: the module step the chat events belong to (validated server-side). */
  stepId?: string;
  turns: ChatTurnView[];
  setTurns: (fn: (prev: ChatTurnView[]) => ChatTurnView[]) => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  files: FileItem[];
  attachFromFiles: boolean;
  density: "compact" | "comfortable";
  emit: (intent: Intent) => void;
  /** Chat is the main region (centered reading column) rather than a side panel. */
  wide?: boolean;
  /** Shell look: centered greeting + composer, centered pill composer, or side panel. */
  variant?: "center" | "pill" | "panel";
  /** Connected catalog connectors for the composer's "+" menu, each switchable on/off for the chats. */
  connectors?: { id: string; label: string; on: boolean }[];
  onToggleConnector?: (id: string, on: boolean) => void;
  /** The learner's industry practice connectors (neutral names). */
  practice?: string[];
  onOpenConnectors?: () => void;
  /** Text already in the composer when the panel opens (free play from a forløb lesson). */
  initialText?: string;
  /** Workpane shell: the tool's own composer parts — placeholder, "+" menu content, icons by send, the row under the box. */
  placeholder?: string;
  renderMenu?: (api: { close: () => void; openPicker: () => void }) => ReactNode;
  composerTools?: ReactNode;
  belowComposer?: ReactNode | ((api: { setText: (text: string) => void }) => ReactNode);
  hideSuggestions?: boolean;
  /** Start-screen heading instead of the shell default. */
  heading?: string;
  /** One-row composer: "+", the text field and the tools on a single line. */
  inline?: boolean;
  menuClassName?: string;
}

export function ChatPanel({ sessionId, stepId, turns, setTurns, conversationId, setConversationId, files, attachFromFiles, density, emit, wide = false, variant = "panel", connectors = [], practice = [], onOpenConnectors = () => undefined, onToggleConnector = () => undefined, initialText = "", placeholder = t.chat.placeholder, renderMenu, composerTools, belowComposer, hideSuggestions = false, heading, inline = false, menuClassName = "w-60" }: Props) {
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const greeting = useSyncExternalStore(noSubscribe, clientGreeting, () => format(t.chat.greeting.neutral, { name: t.chat.persona }));
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<PiiKind | null>(null);
  const [warn, setWarn] = useState<PiiKind[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolNotes, setToolNotes] = useState<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const compact = density === "compact";
  const column = wide ? "mx-auto w-full max-w-3xl" : "w-full";

  // The "+" menu and the file picker close on Escape or a click outside the composer.
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!menuOpen && !picker) return;
    const close = () => {
      setMenuOpen(false);
      setPicker(false);
    };
    const down = (e: MouseEvent) => form.current && !form.current.contains(e.target as Node) && close();
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [menuOpen, picker]);

  // Text put in from outside the composer (suggestions under it) moves focus to the field.
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    if (focusTick > 0) composer.current?.focus();
  }, [focusTick]);

  // Keep the newest message in view while the answer streams in.
  useEffect(() => {
    const el = scroller.current;
    if (el && turns.length > 0) el.scrollTop = el.scrollHeight;
  }, [turns, toolNotes, error, blocked]);

  async function send(override: boolean) {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    setBusy(true);
    setToolNotes([]);
    const userTurn: ChatTurnView = { seq: Date.now(), role: "user", text: message };
    const replyTurn: ChatTurnView = { seq: Date.now() + 1, role: "assistant", text: "" };
    setTurns((prev) => [...prev, userTurn, replyTurn]);
    setText("");
    const sentAttachments = attachments;
    setAttachments([]);
    const failure = await streamChat(
      sessionId,
      { message, conversationId: conversationId ?? undefined, attachmentFileIds: sentAttachments, clientPiiOverride: override, ...(stepId ? { stepId } : {}) },
      {
        onStart: (id) => setConversationId(id),
        onDelta: (d) => setTurns((prev) => prev.map((x) => (x.seq === replyTurn.seq ? { ...x, text: x.text + d } : x))),
        onTool: (info) => setToolNotes((n) => [...n, format(t.chat.toolUsed, { tool: info.tool, count: info.resultCount })]),
      },
    );
    if (failure) {
      setError(failure.message ?? t.chat.error);
      setTurns((prev) => prev.filter((x) => x.seq !== replyTurn.seq || x.text !== ""));
    }
    setBusy(false);
  }

  function onSubmit() {
    const pii = detectPii(text);
    if (pii.action === "BLOCK") {
      const kind = pii.findings.find((f) => f.severity === "BLOCK")?.kind ?? pii.kinds[0] ?? "CPR";
      setBlocked(kind);
      emit({ event: { type: "PII_BLOCKED", payload: { surface: "chat", kinds: pii.findings.filter((f) => f.severity === "BLOCK").map((f) => f.kind) } } });
      return;
    }
    setBlocked(null);
    if (pii.action === "WARN") {
      setWarn(pii.kinds);
      return;
    }
    void send(false);
  }

  function attach(fileId: string) {
    setPicker(false);
    if (attachments.includes(fileId)) return;
    setAttachments((a) => [...a, fileId]);
    // A file attached before the first message starts the conversation, so the attachment is recorded right away.
    let id = conversationId;
    if (!id) {
      id = newOverlayId("conv");
      setConversationId(id);
      emit({ event: { type: "CHAT_CONVERSATION_STARTED", payload: { conversationId: id } } });
    }
    emit({ event: { type: "CHAT_FILE_ATTACHED", payload: { conversationId: id, fileId } } });
  }

  const fileName = (id: string) => files.find((f) => f.id === id)?.name ?? id;

  const connectedCount = connectors.filter((c) => c.on).length;

  // Messages (or the variant's empty state), the composer and the "+" menu. The layout mirrors the familiar desktop
  // chat apps per shell — centered greeting, centered pill, or side panel — always in Mindforward's own look.
  const menu = menuOpen && (
    <div role="dialog" aria-label={t.chat.menu.open} className={cx("absolute left-0 z-20 flex flex-col rounded-xl border border-line bg-surface p-1.5 shadow-lg", renderMenu ? menuClassName : "w-[min(22rem,calc(100vw-2rem))] overflow-hidden", turns.length === 0 && variant !== "panel" ? "top-full mt-2" : "bottom-full mb-2")} data-testid="composer-menu">
      {renderMenu ? renderMenu({ close: () => setMenuOpen(false), openPicker: () => { setMenuOpen(false); setPicker(true); } }) : <>
      {attachFromFiles && (
        <button type="button" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm text-ink hover:bg-sunken" onClick={() => { setMenuOpen(false); setPicker(true); emit({ event: { type: "UI_CLICKED", target: "composer.attach", payload: { region: "composer", control: "attach" } } }); }}>
          <SbIcon name="paperclip" className="text-ink-subtle" />
          {t.chat.menu.attach}
        </button>
      )}
      <p className="px-2.5 pt-2.5 pb-1 text-overline text-ink-subtle uppercase">{t.connectors.catalog.inChatTitle}</p>
      {connectors.length === 0 && <p className="px-2.5 py-1.5 text-caption text-ink-subtle">{t.connectors.catalog.noneConnected}</p>}
      {connectors.map((c) => (
        <div key={c.id} className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-body-sm text-ink" data-testid="menu-connector" data-id={c.id}>
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-sunken text-caption font-semibold text-ink ring-1 ring-line ring-inset" aria-hidden="true">
            {c.label.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex-1 truncate">{c.label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={c.on}
            aria-label={format(c.on ? t.connectors.catalog.turnOff : t.connectors.catalog.turnOn, { name: c.label })}
            onClick={() => onToggleConnector(c.id, !c.on)}
            className={cx("relative h-5 w-9 shrink-0 rounded-full transition-colors", c.on ? "bg-accent" : "bg-line-strong")}
          >
            <span className={cx("absolute top-0.5 size-4 rounded-full bg-surface transition-all", c.on ? "left-[1.125rem]" : "left-0.5")} />
          </button>
        </div>
      ))}
      {practice.length > 0 && (
        <>
          <p className="px-2.5 pt-2.5 pb-1 text-overline text-ink-subtle uppercase">{t.chat.menu.industry}</p>
          {practice.map((label) => (
            <button key={label} type="button" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm text-ink hover:bg-sunken" onClick={() => { setMenuOpen(false); onOpenConnectors(); }}>
              <SbIcon name="sparkle" className="text-accent" />
              <span className="flex-1">{label}</span>
              <SbIcon name="chevronRight" size={14} className="text-ink-subtle" />
            </button>
          ))}
        </>
      )}
      <div className="my-1 h-px bg-line" />
      <button type="button" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body-sm text-ink-muted hover:bg-sunken" onClick={() => { setMenuOpen(false); onOpenConnectors(); }}>
        <SbIcon name="apps" className="text-ink-subtle" />
        {t.connectors.catalog.manage}
      </button>
      </>}
    </div>
  );

  const composerBox = (
    <form
      ref={form}
      className={cx("relative flex flex-col gap-2", variant === "panel" ? "w-full" : "mx-auto w-full max-w-3xl")}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {menu}
      {picker && (
        <div role="dialog" aria-label={t.chat.attachTitle} className={cx("absolute inset-x-0 z-10 flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg", turns.length === 0 && variant !== "panel" ? "top-full mt-2" : "bottom-full mb-2")}>
          <div className="flex flex-col gap-0.5 border-b border-line px-4 py-3">
            <p className="text-label text-ink">{t.chat.attachTitle}</p>
            <p className="text-caption text-ink-muted">{t.chat.attachHint}</p>
          </div>
          <ul className="max-h-60 overflow-y-auto p-1.5">
            {files.map((f) => (
              <li key={f.id}>
                <button type="button" className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-body-sm text-ink hover:bg-sunken" onClick={() => attach(f.id)}>
                  <SbIcon name={f.kind === "doc" ? "file" : "table"} className="text-ink-subtle" />
                  <span className="truncate">{f.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        className={cx(
          "flex border border-line bg-surface transition-[border-color,box-shadow] focus-within:border-accent/60",
          inline ? "flex-row flex-wrap items-center gap-x-1 px-2 py-1.5" : "flex-col",
          inline ? "rounded-[1.75rem] shadow-md" : variant === "pill" ? "rounded-[1.75rem] shadow-md" : variant === "center" ? "rounded-2xl shadow-md" : "rounded-xl shadow-xs",
        )}
      >
        {attachments.length > 0 && (
          <div className={cx("flex flex-wrap items-center gap-1.5 px-4 pt-3", inline && "order-first basis-full pt-1.5 pb-1")}>
            <span className="text-caption text-ink-muted">{t.chat.attached}</span>
            {attachments.map((id) => (
              <button
                key={id}
                type="button"
                className="inline-flex h-6 items-center gap-1.5 rounded-xs bg-sunken px-2 text-caption text-ink ring-1 ring-line ring-inset hover:ring-line-strong"
                onClick={() => setAttachments((a) => a.filter((x) => x !== id))}
                aria-label={`${t.chat.removeAttachment} ${fileName(id)}`}
              >
                {fileName(id)}
                <SbIcon name="x" size={12} className="text-ink-subtle" />
              </button>
            ))}
          </div>
        )}
        <label className="sr-only" htmlFor="sandbox-composer">
          {placeholder}
        </label>
        <textarea
          id="sandbox-composer"
          ref={composer}
          className={cx("resize-none bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none", inline ? "order-1 h-10 min-h-0 w-auto min-w-[9rem] flex-1 px-1.5 py-2 leading-6" : variant === "panel" ? "min-h-14 w-full px-4 pt-3" : "min-h-16 w-full px-5 pt-4")}
          rows={inline ? 1 : undefined}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          maxLength={MAX_CHARS}
        />
        <div className={inline ? "contents" : "flex items-center gap-1.5 px-3 pb-3"}>
          <button
            type="button"
            aria-label={t.chat.menu.open}
            aria-expanded={menuOpen}
            className={cx("grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink", inline ? "" : variant === "pill" ? "bg-sunken" : "border border-line")}
            onClick={() => {
              setPicker(false);
              setMenuOpen((o) => !o);
            }}
          >
            <SbIcon name="plus" />
          </button>
          {connectedCount > 0 && (
            <button type="button" onClick={() => setMenuOpen((o) => !o)} className={cx("inline-flex h-8 items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-3 text-caption font-medium text-accent-ink", inline && "order-2")}>
              <SbIcon name="plug" size={14} />
              {connectedCount === 1 ? t.chat.menu.one : format(t.chat.menu.count, { n: connectedCount })}
            </button>
          )}
          <span className={cx("ml-auto flex items-center gap-2", inline && "order-2 gap-1")}>
            {text.length > MAX_CHARS * 0.75 && (
              <span className="font-mono text-mono text-ink-subtle" aria-label={format(t.chat.counterLabel, { n: text.length, max: nf.format(MAX_CHARS) })}>
                {format(t.chat.counter, { n: nf.format(text.length), max: nf.format(MAX_CHARS) })}
              </span>
            )}
            {composerTools ?? (variant !== "panel" && <span className="hidden text-caption text-ink-subtle sm:inline">{t.modelLabel}</span>)}
            <button
              type="submit"
              aria-label={busy ? t.chat.sending : t.chat.send}
              disabled={busy || !text.trim()}
              className={cx("grid size-9 place-items-center rounded-full text-on-accent transition-[background-color,opacity] disabled:opacity-35", variant === "pill" ? "bg-ink" : "bg-accent hover:bg-accent-hover")}
            >
              {busy ? <span className="size-2 animate-pulse rounded-full bg-on-accent" aria-hidden="true" /> : <SbIcon name="arrowUp" />}
            </button>
          </span>
        </div>
      </div>
      {typeof belowComposer === "function"
        ? belowComposer({
            setText: (v) => {
              setText(v);
              setFocusTick((n) => n + 1);
            },
          })
        : belowComposer}
    </form>
  );

  const suggestionChips = (
    <ul className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-2">
      {t.chat.suggestions.map((s) => (
        <li key={s}>
          <button
            type="button"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-left text-body-sm text-ink-muted transition-[border-color,color] hover:border-line-strong hover:text-ink"
            aria-label={`${t.chat.useSuggestion}: ${s}`}
            onClick={() => {
              setText(s);
              composer.current?.focus();
            }}
          >
            <SbIcon name="arrowRight" size={14} className="shrink-0 text-ink-subtle" />
            <span className="truncate">{s}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const empty = turns.length === 0;
  const centered = empty && variant !== "panel";

  return (
    <section className={cx("flex min-h-0 flex-1 flex-col", variant === "panel" ? "bg-bg" : "bg-surface")} data-testid="sandbox-chat" data-variant={variant} aria-label={t.terms.chat}>
      {centered ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7 overflow-y-auto px-4 py-8 sm:px-6">
          {variant === "center" ? (
            <h2 className={cx("flex items-center gap-3 text-center text-ink", heading ? "text-title-2" : "text-title-1")}>
              {heading ?? greeting}
            </h2>
          ) : (
            <h2 className="text-center text-title-2 text-ink">{heading ?? t.chat.askTitle}</h2>
          )}
          {composerBox}
          {!hideSuggestions && suggestionChips}
          {(error || blocked) && (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              {error && <Notice tone="error">{error}</Notice>}
              {blocked && (
                <div data-testid="pii-blocked">
                  <Notice tone="danger">{t.pii.blocked[blocked]}</Notice>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div ref={scroller} className={cx("flex min-h-0 flex-1 flex-col overflow-y-auto", compact ? "px-4 py-5" : "px-4 py-6 sm:px-6 sm:py-8")}>
            <ol className={cx("flex flex-col", compact ? "gap-4" : "gap-6", column, empty && "my-auto")} aria-live="polite">
              {empty && (
                <li className="flex flex-col gap-6">
                  <div className="flex flex-col items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-title-3 text-ink">{t.chat.emptyTitle}</h2>
                      <p className="text-body-sm text-ink-muted">{t.chat.empty}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-overline text-ink-subtle uppercase">{t.chat.suggestionsTitle}</p>
                    <ul className="grid gap-2">
                      {t.chat.suggestions.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            className="flex h-full w-full items-start gap-2.5 rounded-md border border-line bg-surface px-3.5 py-3 text-left text-body-sm text-ink transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm"
                            aria-label={`${t.chat.useSuggestion}: ${s}`}
                            onClick={() => {
                              setText(s);
                              composer.current?.focus();
                            }}
                          >
                            <SbIcon name="arrowRight" className="mt-0.5 text-ink-subtle" />
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              )}
              {turns.map((turn) => {
                const who = turn.role === "assistant" ? t.modelLabel : t.chat.you;
                return turn.role === "user" ? (
                  <li key={turn.seq} className="flex flex-col items-end gap-1.5">
                    <p className="sr-only">{who}</p>
                    <p className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-body whitespace-pre-wrap", variant === "panel" ? "rounded-br-md bg-accent text-on-accent" : "bg-sunken text-ink")}>{turn.text}</p>
                  </li>
                ) : (
                  <li key={turn.seq} className={cx("flex gap-3", variant === "panel" && "flex-col gap-2 rounded-xl border border-line bg-surface p-4")}>
                    <span className="shrink-0 pt-0.5">
                      <ModelAvatar size={variant === "panel" ? "sm" : "md"} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="sr-only" data-testid="model-label">
                        {who}
                      </span>
                      <Badge tone="accent" className="self-start" aria-hidden="true">
                        {who}
                      </Badge>
                      {turn.text ? (
                        <p className="text-body leading-relaxed whitespace-pre-wrap text-ink">{turn.text}</p>
                      ) : (
                        <p className="flex items-center gap-2 text-body-sm text-ink-muted">
                          <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                          {busy ? t.chat.sending : ""}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {(toolNotes.length > 0 || error || blocked) && (
              <div className={cx("mt-4 flex flex-col gap-3", column)}>
                {toolNotes.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {toolNotes.map((n, i) => (
                      <li key={i} className="flex items-center gap-2 text-caption text-ink-muted">
                        <SbIcon name="plug" size={14} className="text-ink-subtle" />
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
                {error && <Notice tone="error">{error}</Notice>}
                {blocked && (
                  <div data-testid="pii-blocked">
                    <Notice tone="danger">{t.pii.blocked[blocked]}</Notice>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className={cx("shrink-0", variant === "panel" ? "border-t border-line bg-bg p-3" : "bg-surface px-4 pt-2 pb-4 sm:px-6")}>{composerBox}</div>
        </>
      )}

      {warn && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="pii-warn-title" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-line bg-surface p-6 shadow-lg">
            <h2 id="pii-warn-title" className="text-title-3 text-ink">
              {t.pii.warnTitle}
            </h2>
            <Notice tone="danger">{t.pii.warnBody}</Notice>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  emit({ event: { type: "PII_WARNING_SHOWN", payload: { surface: "chat", kinds: warn, overridden: false } } });
                  setWarn(null);
                }}
              >
                {t.pii.fix}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setWarn(null);
                  void send(true);
                }}
              >
                {t.pii.proceed}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
