"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/ui/brand";
import { Badge, Button, cx, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { detectPii, type PiiKind } from "@/lib/pii";
import { postIntent, streamChat } from "./api";
import { SbIcon } from "./sandbox-icons";
import type { ChatTurnView, FileItem, Intent } from "./types";

const t = getMessages().sandbox;
const MAX_CHARS = 4000;
const nf = new Intl.NumberFormat("da-DK");

interface Props {
  sessionId: string;
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
}

export function ChatPanel({ sessionId, turns, setTurns, conversationId, setConversationId, files, attachFromFiles, density, emit, wide = false }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<PiiKind | null>(null);
  const [warn, setWarn] = useState<PiiKind[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolNotes, setToolNotes] = useState<string[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const compact = density === "compact";
  const column = wide ? "mx-auto w-full max-w-read" : "w-full";

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
      { message, conversationId: conversationId ?? undefined, attachmentFileIds: sentAttachments, clientPiiOverride: override },
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
    if (conversationId) void postIntent(sessionId, { event: { type: "CHAT_FILE_ATTACHED", payload: { conversationId, fileId } } });
  }

  const fileName = (id: string) => files.find((f) => f.id === id)?.name ?? id;

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-bg" data-testid="sandbox-chat" aria-label={t.terms.chat}>
      <div ref={scroller} className={cx("flex min-h-0 flex-1 flex-col overflow-y-auto", compact ? "px-4 py-5" : "px-4 py-6 sm:px-6 sm:py-8")}>
        <ol className={cx("flex flex-col", compact ? "gap-4" : "gap-6", column, turns.length === 0 && "my-auto")} aria-live="polite">
          {turns.length === 0 && (
            <li className="flex flex-col gap-6">
              <div className="flex flex-col items-start gap-3">
                <LogoMark size={32} />
                <div className="flex flex-col gap-1">
                  <h2 className={cx(compact ? "text-title-3" : "text-title-2", "text-ink")}>{t.chat.emptyTitle}</h2>
                  <p className="text-body-sm text-ink-muted">{t.chat.empty}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-overline text-ink-subtle uppercase">{t.chat.suggestionsTitle}</p>
                <ul className={cx("grid gap-2", wide && "sm:grid-cols-2")}>
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
                <p className="text-caption text-ink-subtle">{who}</p>
                <p className="max-w-[85%] rounded-lg rounded-tr-xs bg-accent-soft px-4 py-2.5 text-body whitespace-pre-wrap text-ink">{turn.text}</p>
              </li>
            ) : (
              <li key={turn.seq} className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-4 sm:p-5">
                <p className="flex items-center gap-2">
                  <LogoMark size={18} />
                  <Badge tone="accent">
                    <span data-testid="model-label">{who}</span>
                  </Badge>
                </p>
                {turn.text ? (
                  <p className="text-body leading-relaxed whitespace-pre-wrap text-ink">{turn.text}</p>
                ) : (
                  <p className="flex items-center gap-2 text-body-sm text-ink-muted">
                    <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                    {busy ? t.chat.sending : ""}
                  </p>
                )}
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

      <div className={cx("shrink-0 border-t border-line bg-bg", compact ? "p-3" : "px-4 py-4 sm:px-6")}>
        <form
          className={cx("relative flex flex-col gap-2", column)}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {picker && (
            <div role="dialog" aria-label={t.chat.attachTitle} className="absolute inset-x-0 bottom-full z-10 mb-2 flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-md">
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
          <div className="flex flex-col rounded-lg border border-line-strong bg-surface shadow-xs transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-ring">
            {attachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-3 pt-3">
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
              {t.chat.placeholder}
            </label>
            <textarea
              id="sandbox-composer"
              ref={composer}
              className={cx("w-full resize-none bg-transparent px-4 pt-3 text-body text-ink placeholder:text-ink-subtle focus:outline-none", compact ? "min-h-16" : "min-h-20")}
              placeholder={t.chat.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_CHARS}
            />
            <div className="flex items-center gap-2 px-2 pb-2">
              {attachFromFiles && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={picker}
                  onClick={() => {
                    setPicker((p) => !p);
                    emit({ event: { type: "UI_CLICKED", target: "composer.attach", payload: { region: "composer", control: "attach" } } });
                  }}
                >
                  <SbIcon name="paperclip" />
                  {t.terms.attach}
                </Button>
              )}
              <span className="ml-auto font-mono text-mono text-ink-subtle" aria-label={format(t.chat.counterLabel, { n: text.length, max: nf.format(MAX_CHARS) })}>
                {format(t.chat.counter, { n: nf.format(text.length), max: nf.format(MAX_CHARS) })}
              </span>
              <Button type="submit" size="sm" disabled={busy || !text.trim()} icon={busy ? undefined : "send"}>
                {busy ? t.chat.sending : t.chat.send}
              </Button>
            </div>
          </div>
        </form>
      </div>

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
