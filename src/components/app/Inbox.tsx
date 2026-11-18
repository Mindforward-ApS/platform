"use client";

import { useState } from "react";
import { MagnifyingGlassIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { Avatar, Card } from "./ui";
import type { Thread } from "@/content/platform";

export function Inbox({ threads: initial }: { threads: Thread[] }) {
  const [threads, setThreads] = useState(initial);
  const [id, setId] = useState(initial[0].id);
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const t = threads.find((x) => x.id === id)!;
  const list = threads.filter((x) => !q.trim() || `${x.from} ${x.subject}`.toLowerCase().includes(q.trim().toLowerCase()));

  function open(tid: string) {
    setId(tid);
    setThreads((ts) => ts.map((x) => (x.id === tid ? { ...x, unread: false } : x)));
  }
  function send() {
    if (!draft.trim()) return;
    setThreads((ts) => ts.map((x) => (x.id === id ? { ...x, messages: [...x.messages, { me: true, text: draft.trim(), time: "Nu" }] } : x)));
    setDraft("");
  }

  return (
    <Card className="grid h-[calc(100svh-13rem)] min-h-[30rem] overflow-hidden md:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-r border-[var(--border)]">
        <div className="border-b border-[var(--border)] p-3">
          <label className="app-input flex h-9 items-center gap-2 rounded-[6px] px-3 text-[0.8125rem]">
            <MagnifyingGlassIcon size={16} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg i beskeder" className="w-full bg-transparent text-heading outline-none placeholder:text-muted" />
          </label>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.map((x) => (
            <li key={x.id}>
              <button onClick={() => open(x.id)} className={`flex w-full gap-3 border-b border-[var(--border)] px-3 py-3 text-left hover:bg-[var(--hover-fill)] ${x.id === id ? "bg-[var(--hover-fill)]" : ""}`}>
                <Avatar initials={x.initials} size={34} tone={x.initials === "MF" ? "soft" : "ink"} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-[0.8125rem] ${x.unread ? "font-semibold text-heading" : "font-medium text-text"}`}>{x.from}</span>
                    <span className="shrink-0 text-[0.6875rem] text-muted">{x.time}</span>
                  </span>
                  <span className={`block truncate text-[0.75rem] ${x.unread ? "font-medium text-heading" : "text-text"}`}>{x.subject}</span>
                  <span className="block truncate text-[0.6875rem] text-muted">{x.preview}</span>
                </span>
                {x.unread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--coral)]" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
          <Avatar initials={t.initials} size={34} tone={t.initials === "MF" ? "soft" : "ink"} />
          <div>
            <div className="text-[0.8125rem] font-semibold text-heading">{t.subject}</div>
            <div className="text-[0.6875rem] text-muted">{t.from}</div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-[#faf7f5] p-5">
          {t.messages.map((m, i) => (
            <div key={i} className={`max-w-[34rem] ${m.me ? "self-end" : "self-start"}`}>
              <div className={`rounded-[12px] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed ${m.me ? "bg-[var(--ink)] text-white" : "border border-[var(--border)] bg-white text-text"}`}>{m.text}</div>
              <div className={`mt-1 text-[0.625rem] text-muted ${m.me ? "text-right" : ""}`}>{m.time}</div>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-[var(--border)] p-3">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Skriv et svar …" className="app-input h-9 flex-1 rounded-[6px] px-3 text-[0.8125rem] text-heading outline-none placeholder:text-muted" />
          <button type="submit" disabled={!draft.trim()} className="app-btn app-btn-primary disabled:opacity-40">Send <PaperPlaneRightIcon size={14} /></button>
        </form>
      </div>
    </Card>
  );
}
