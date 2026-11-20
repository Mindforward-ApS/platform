"use client";
// Beskeder: a plain chat (Marco 2026-11-03: "Bare lav en helt almindelig chat"). Conversation list on the left,
// the conversation on the right, a text field at the bottom. Only the two lists scroll. Ported 1:1 to /beskeder.
// Greb has no messages backend yet: example threads, marked "Eksempeldata"; sent messages stay on this page only.
import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/platform/ui";
import type { Thread } from "@/components/platform/demo-data";

const INK = "var(--pf-201613)", O = "var(--pf-e2643f)", LINE = "var(--pf-f1e9e4)";

function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full bg-[var(--pf-f3eeeb)] font-semibold text-heading" style={{ width: size, height: size, fontSize: size * 0.34 }}>{initials}</span>;
}

export function Chat({ threads: initial }: { threads: Thread[] }) {
  const [threads, setThreads] = useState(initial);
  const [sel, setSel] = useState(initial[0]?.id);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const t = threads.find((x) => x.id === sel) ?? threads[0];
  const list = threads.filter((x) => !q || `${x.from} ${x.subject}`.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [sel, t?.messages.length]);

  const open = (id: string) => { setSel(id); setThreads((ts) => ts.map((x) => (x.id === id ? { ...x, unread: false } : x))); };
  const send = () => {
    if (!draft.trim()) return;
    setThreads((ts) => ts.map((x) => (x.id === t.id ? { ...x, messages: [...x.messages, { me: true, text: draft.trim(), time: "Nu" }], preview: draft.trim(), time: "Nu" } : x)));
    setDraft("");
  };

  return (
    <div data-pf-fill className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:h-[max(560px,calc(100svh-5.9rem))] lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col rounded-[16px] bg-pf-white p-3">
        <h1 className="flex items-center justify-between gap-2 px-2 pb-3 pt-1 text-[22px] font-semibold tracking-[-0.02em] text-heading">Beskeder <Demo /></h1>
        <label className="relative">
          <span className="sr-only">Søg</span>
          <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pf-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg" className="h-9 w-full rounded-[10px] bg-[var(--pf-f7f2ee)] pl-9 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-[var(--pf-201613)]" />
        </label>
        <ul className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {list.map((x) => (
            <li key={x.id}>
              <button onClick={() => open(x.id)} className={`flex w-full items-center gap-3 rounded-[12px] p-2.5 text-left transition ${x.id === t.id ? "bg-[var(--pf-f7f2ee)]" : "hover:bg-[var(--pf-fbf8f6)]"}`}>
                <Avatar initials={x.initials} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2"><b className={`truncate text-[13.5px] text-heading ${x.unread ? "font-semibold" : "font-medium"}`}>{x.from}</b><small className="shrink-0 text-[11px] text-pf-muted">{x.time}</small></span>
                  <span className="flex items-center gap-2"><span className={`truncate text-[12.5px] ${x.unread ? "font-medium text-heading" : "text-pf-muted"}`}>{x.preview}</span>{x.unread && <i className="size-2 shrink-0 rounded-full" style={{ background: O }} />}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[16px] bg-pf-white lg:min-h-0">
        <header className="flex items-center gap-3 border-b px-5 py-3" style={{ borderColor: LINE }}>
          <Avatar initials={t.initials} size={36} />
          <div className="min-w-0"><p className="truncate text-[14.5px] font-semibold text-heading">{t.from}</p><p className="truncate text-[12px] text-pf-muted">{t.subject}</p></div>
        </header>
        <div ref={box} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto flex max-w-[720px] flex-col gap-2">
            {t.messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.me ? "items-end" : "items-start"}`}>
                <p className={`max-w-[75%] whitespace-pre-line rounded-[18px] px-4 py-2.5 text-[14px] leading-[1.5] ${m.me ? "rounded-br-[6px] text-pf-white" : "rounded-bl-[6px] bg-[var(--pf-f3eeeb)] text-heading"}`} style={m.me ? { background: INK } : undefined}>{m.text}</p>
                <small className="mt-1 px-1 text-[11px] text-pf-muted">{m.time}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t p-3" style={{ borderColor: LINE }}>
          <div className="mx-auto flex max-w-[720px] items-center gap-2 rounded-full bg-[var(--pf-f7f2ee)] p-1.5 pl-4">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={`Skriv til ${t.from.split(" ")[0]} …`} className="h-9 min-w-0 flex-1 bg-transparent text-[14px] text-heading outline-none placeholder:text-pf-muted" />
            <button onClick={send} disabled={!draft.trim()} aria-label="Send" className="grid size-9 place-items-center rounded-full text-pf-white transition disabled:opacity-30" style={{ background: INK }}><ArrowUpIcon size={16} weight="bold" /></button>
          </div>
        </div>
      </section>
    </div>
  );
}
