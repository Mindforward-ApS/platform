"use client";

import { Fragment, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { Button, buttonClass, cx } from "@/components/ui/primitives";

// Support chat widget (docs/08 § 1). Reads the SSE answer from POST /api/support/chat. All strings come from the
// i18n layer via props. `SupportWidget` is the panel (inline on /konto/support); `SupportLauncher` is the floating
// help button that opens the same panel on other account pages.

interface Strings {
  title: string;
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
  sources: string;
  suggestionsLabel: string;
  suggestions: readonly string[];
  open: string;
  close: string;
  fullPage: string;
  errors: { generic: string };
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

const LINK_PATTERN = /(https:\/\/[^\s)]+|\/hjaelp(?:\/[a-z0-9-]+)?|\/konto(?:\/[a-z0-9-]+)*(?:#[a-z]+)?)/g;

/** Turns /hjaelp/… paths and https links in a reply into anchors (text only, never HTML). */
export function linkify(text: string): ReactNode[] {
  const parts = text.split(LINK_PATTERN);
  return parts.map((p, i) =>
    /^(https:\/\/|\/hjaelp|\/konto)/.test(p) ? (
      <a key={i} className="font-medium break-all text-accent underline decoration-accent/30 underline-offset-[3px] hover:text-accent-hover" href={p.replace(/[.,]+$/, "")}>
        {p}
      </a>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

/** Help-center articles cited in a reply (unique slugs, in order). Display only — the links stay in the text. */
export function helpSources(text: string): { href: string; title: string }[] {
  const seen = new Set<string>();
  const out: { href: string; title: string }[] = [];
  for (const match of text.matchAll(/\/hjaelp\/([a-z0-9-]+)/g)) {
    const slug = match[1]!;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const words = slug.replace(/-/g, " ");
    out.push({ href: `/hjaelp/${slug}`, title: words.charAt(0).toUpperCase() + words.slice(1) });
  }
  return out;
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

export function SupportWidget({ t, variant = "page", autoFocus = false }: { t: Strings; variant?: "page" | "floating"; autoFocus?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const ids = useId();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const list = listRef.current;
    if (variant === "floating" && list) list.scrollTop = list.scrollHeight;
  }, [messages, variant]);

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
    inputRef.current?.focus();
  }

  function suggest(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  const floating = variant === "floating";
  const inputId = `${ids}-input`;
  const noteId = `${ids}-pii`;

  return (
    <section
      className={cx("flex min-h-0 flex-col bg-surface", floating ? "flex-1" : "overflow-hidden rounded-lg border border-line")}
      data-testid="support-widget"
      aria-label={t.label}
    >
      {/* Transparency label (AI-forordningen art. 50): always visible above the conversation. */}
      <p className="flex items-start gap-2 border-b border-line bg-sunken px-5 py-3 text-body-sm text-ink-muted" role="note">
        <Icon name="sparkle" className="mt-0.5 shrink-0 text-accent" />
        <span>{t.label}</span>
      </p>

      <ol
        ref={listRef}
        className={cx("flex flex-col gap-5 px-5 py-5", floating ? "min-h-0 flex-1 overflow-y-auto" : "min-h-56")}
        aria-live="polite"
      >
        {messages.length === 0 && (
          <li className="flex flex-col gap-4">
            <p className="text-body text-ink">{t.intro}</p>
            <div className="flex flex-col gap-2">
              <p className="text-overline text-ink-subtle uppercase">{t.suggestionsLabel}</p>
              <div className="flex flex-wrap gap-2">
                {t.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => suggest(s)}
                    className="rounded-sm border border-line bg-surface px-3 py-1.5 text-left text-body-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </li>
        )}
        {messages.map((m, i) => {
          const streaming = busy && i === messages.length - 1;
          if (m.role === "user") {
            return (
              <li key={i} className="flex flex-col items-end gap-1" data-testid="support-question">
                <span className="text-caption text-ink-subtle">{t.you}</span>
                <span className="max-w-[85%] rounded-lg rounded-br-xs bg-accent-soft px-4 py-2.5 text-body whitespace-pre-wrap text-ink">{m.text}</span>
              </li>
            );
          }
          const sources = streaming ? [] : helpSources(m.text);
          return (
            <li key={i} className="flex flex-col items-start gap-1" data-testid="support-answer">
              <span className="flex items-center gap-1.5 text-caption text-ink-subtle">
                <Icon name="chat" size={12} />
                {t.assistant}
              </span>
              <span className="max-w-full text-body whitespace-pre-wrap text-ink">
                {streaming && !m.text ? <span className="text-ink-muted">{t.sending}</span> : linkify(m.text)}
              </span>
              {sources.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <span className="text-caption text-ink-subtle">{t.sources}</span>
                  <ul className="flex flex-wrap gap-2">
                    {sources.map((s) => (
                      <li key={s.href}>
                        <a
                          href={s.href}
                          className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1 text-body-sm text-ink transition-colors hover:border-line-strong hover:bg-sunken"
                        >
                          <Icon name="file" size={14} className="text-ink-muted" />
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="px-5 pb-4">
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-body-sm text-ink">
            <Icon name="alert" className="mt-0.5 shrink-0 text-danger" />
            {error}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3 border-t border-line bg-surface px-5 py-4">
        <label htmlFor={inputId} className="text-label text-ink">
          {t.inputLabel}
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          className="w-full resize-none rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-body text-ink shadow-xs transition-[border-color,box-shadow] duration-[120ms] placeholder:text-ink-subtle focus:border-accent focus:shadow-ring focus:outline-none"
          rows={floating ? 2 : 3}
          maxLength={2000}
          value={input}
          placeholder={t.placeholder}
          aria-describedby={noteId}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id={noteId} className="flex min-w-0 flex-1 basis-56 items-start gap-1.5 text-caption text-ink-muted">
            <Icon name="lock" size={12} className="mt-0.5 shrink-0" />
            {t.piiNote}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {messages.length > 0 && (
              <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
                {t.newConversation}
              </Button>
            )}
            <Button type="submit" icon={busy ? undefined : "send"} disabled={busy}>
              {busy ? t.sending : t.send}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

/** Floating help button (bottom right) that opens the support panel. The conversation survives closing. */
export function SupportLauncher({ t, href = "/konto/support" }: { t: Strings; href?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle() {
    setMounted(true);
    setOpen((o) => !o);
  }

  return (
    <>
      {mounted && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.title}
          hidden={!open}
          className="fixed inset-x-4 bottom-20 z-40 flex max-h-[min(640px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[400px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <p className="flex items-center gap-2 text-title-3 text-ink">
              <Icon name="chat" size={18} className="text-accent" />
              {t.title}
            </p>
            <div className="flex items-center gap-1">
              <a href={href} className={buttonClass("ghost", "sm")}>
                <Icon name="external" />
                <span className="sr-only sm:not-sr-only">{t.fullPage}</span>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t.close}
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
              >
                <Icon name="x" />
              </Button>
            </div>
          </div>
          <SupportWidget t={t} variant="floating" autoFocus={open} />
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={mounted ? panelId : undefined}
        className={cx(
          "fixed right-4 bottom-4 z-40 inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-label text-ink shadow-md transition-[box-shadow,border-color] duration-[120ms] hover:border-line-strong hover:shadow-lg sm:right-6 sm:bottom-6",
        )}
      >
        <Icon name={open ? "x" : "chat"} size={18} className="text-accent" />
        {open ? t.close : t.open}
      </button>
    </>
  );
}
