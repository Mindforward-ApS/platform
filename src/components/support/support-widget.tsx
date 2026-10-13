"use client";

import { Fragment, useRef, useState, type FormEvent, type ReactNode } from "react";

// Support chat widget (docs/08 § 1). Neutral placeholder look (token classes only). Reads the SSE answer from
// POST /api/support/chat. All strings come from the i18n layer via props.

interface Strings {
  label: string;
  intro: string;
  inputLabel: string;
  placeholder: string;
  send: string;
  sending: string;
  you: string;
  assistant: string;
  newConversation: string;
  piiNote: string;
  errors: { generic: string };
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

/** Turns /hjaelp/… paths and https links in a reply into anchors (text only, never HTML). */
export function linkify(text: string): ReactNode[] {
  const parts = text.split(/(https:\/\/[^\s)]+|\/hjaelp(?:\/[a-z0-9-]+)?|\/konto(?:\/[a-z0-9-]+)*(?:#[a-z]+)?)/g);
  return parts.map((p, i) =>
    /^(https:\/\/|\/hjaelp|\/konto)/.test(p) ? (
      <a key={i} className="underline" href={p.replace(/[.,]+$/, "")}>
        {p}
      </a>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

async function readSse(res: Response, onEvent: (event: string, data: Record<string, unknown>) => void) {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf("\n\n");
    while (idx >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = /^event: (.+)$/m.exec(raw)?.[1] ?? "message";
      const data = /^data: (.+)$/m.exec(raw)?.[1];
      if (data) onEvent(event, JSON.parse(data) as Record<string, unknown>);
      idx = buffer.indexOf("\n\n");
    }
  }
}

export function SupportWidget({ t }: { t: Strings }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | undefined>(undefined);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", text: message }, { role: "assistant", text: "" }]);
    const append = (text: string) =>
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last) copy[copy.length - 1] = { ...last, text: last.text + text };
        return copy;
      });
    try {
      const res = await fetch("/api/support/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, conversationId: conversationId.current }) });
      if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setMessages((m) => m.slice(0, -1));
        setError(body.message ?? t.errors.generic);
        return;
      }
      await readSse(res, (event, data) => {
        if (event === "delta" && typeof data.text === "string") append(data.text);
        if (event === "done" && typeof data.conversationId === "string") conversationId.current = data.conversationId;
        if (event === "error") setError(typeof data.message === "string" ? data.message : t.errors.generic);
      });
    } catch {
      setError(t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    conversationId.current = undefined;
    setMessages([]);
    setError(null);
  }

  return (
    <section className="flex flex-col gap-3" data-testid="support-widget" aria-label={t.label}>
      <p className="rounded-md border border-border p-3 text-sm" role="note">
        {t.label}
      </p>
      <p className="text-sm text-muted">{t.intro}</p>
      <ol className="flex flex-col gap-2" aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={`rounded-md border border-border p-3 ${m.role === "user" ? "bg-surface" : "bg-bg"}`} data-testid={m.role === "assistant" ? "support-answer" : "support-question"}>
            <span className="block text-xs text-muted">{m.role === "user" ? t.you : t.assistant}</span>
            <span className="whitespace-pre-wrap">{m.role === "assistant" && !m.text && busy ? t.sending : linkify(m.text)}</span>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="rounded-md border border-danger p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t.inputLabel}</span>
          <textarea className="rounded-md border border-border bg-bg px-3 py-2" rows={3} maxLength={2000} value={input} placeholder={t.placeholder} onChange={(e) => setInput(e.target.value)} />
        </label>
        <p className="text-xs text-muted">{t.piiNote}</p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-accent-fg" disabled={busy}>
            {busy ? t.sending : t.send}
          </button>
          {messages.length > 0 && (
            <button type="button" className="rounded-md border border-border bg-surface px-4 py-2" onClick={reset} disabled={busy}>
              {t.newConversation}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
