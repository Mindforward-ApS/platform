"use client";

import { useState } from "react";
import { format, getMessages } from "@/lib/i18n";
import { detectPii, type PiiKind } from "@/lib/pii";
import { postIntent, streamChat } from "./api";
import type { ChatTurnView, FileItem, Intent } from "./types";

const t = getMessages().sandbox;

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
}

export function ChatPanel({ sessionId, turns, setTurns, conversationId, setConversationId, files, attachFromFiles, density, emit }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<PiiKind | null>(null);
  const [warn, setWarn] = useState<PiiKind[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolNotes, setToolNotes] = useState<string[]>([]);
  const pad = density === "compact" ? "p-2 gap-2" : "p-4 gap-3";

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
    <section className={`flex min-h-0 flex-1 flex-col ${pad}`} data-testid="sandbox-chat" aria-label={t.terms.chat}>
      <ol className="flex flex-1 flex-col gap-3 overflow-y-auto" aria-live="polite">
        {turns.length === 0 && <li className="text-muted">{t.chat.empty}</li>}
        {turns.map((turn) => (
          <li key={turn.seq} className={`rounded-md border border-border p-3 ${turn.role === "user" ? "bg-surface" : "bg-bg"}`}>
            <p className="text-sm font-semibold" data-testid={turn.role === "assistant" ? "model-label" : undefined}>
              {turn.role === "assistant" ? t.modelLabel : t.chat.you}
            </p>
            <p className="whitespace-pre-wrap">{turn.text || (busy ? t.chat.sending : "")}</p>
          </li>
        ))}
      </ol>
      {toolNotes.length > 0 && (
        <ul className="text-sm text-muted">
          {toolNotes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {blocked && (
        <p role="alert" className="text-sm text-danger" data-testid="pii-blocked">
          {t.pii.blocked[blocked]}
        </p>
      )}
      {attachments.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {t.chat.attached}
          {attachments.map((id) => (
            <button key={id} type="button" className="rounded-sm border border-border px-2" onClick={() => setAttachments((a) => a.filter((x) => x !== id))} aria-label={`${t.chat.removeAttachment} ${fileName(id)}`}>
              {fileName(id)} ×
            </button>
          ))}
        </p>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className="sr-only" htmlFor="sandbox-composer">
          {t.chat.placeholder}
        </label>
        <textarea
          id="sandbox-composer"
          className="min-h-20 rounded-md border border-border bg-bg p-2"
          placeholder={t.chat.placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
        />
        <div className="flex gap-2">
          {attachFromFiles && (
            <button
              type="button"
              className="rounded-md border border-border bg-surface px-3 py-2"
              onClick={() => {
                setPicker((p) => !p);
                emit({ event: { type: "UI_CLICKED", target: "composer.attach", payload: { region: "composer", control: "attach" } } });
              }}
            >
              {t.terms.attach}
            </button>
          )}
          <button type="submit" disabled={busy || !text.trim()} className="ml-auto rounded-md bg-accent px-4 py-2 text-accent-fg disabled:opacity-50">
            {busy ? t.chat.sending : t.chat.send}
          </button>
        </div>
        {picker && (
          <div role="dialog" aria-label={t.chat.attachTitle} className="rounded-md border border-border bg-bg p-2">
            <p className="text-sm font-semibold">{t.chat.attachTitle}</p>
            <ul className="max-h-48 overflow-y-auto">
              {files.map((f) => (
                <li key={f.id}>
                  <button type="button" className="w-full p-1 text-left underline" onClick={() => attach(f.id)}>
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
      {warn && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="pii-warn-title" className="fixed inset-0 flex items-center justify-center bg-fg/40 p-4">
          <div className="flex max-w-md flex-col gap-3 rounded-lg bg-bg p-4">
            <h2 id="pii-warn-title" className="font-semibold">
              {t.pii.warnTitle}
            </h2>
            <p>{t.pii.warnBody}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-border bg-surface px-3 py-2"
                onClick={() => {
                  emit({ event: { type: "PII_WARNING_SHOWN", payload: { surface: "chat", kinds: warn, overridden: false } } });
                  setWarn(null);
                }}
              >
                {t.pii.fix}
              </button>
              <button
                type="button"
                className="rounded-md bg-accent px-3 py-2 text-accent-fg"
                onClick={() => {
                  setWarn(null);
                  void send(true);
                }}
              >
                {t.pii.proceed}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
