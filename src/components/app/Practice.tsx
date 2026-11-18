"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, ClockIcon, PaperPlaneRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { Bar, Card, Chip, Demo } from "./ui";
import type { Task } from "@/content/platform";

// Demo practice environment. The AI reply and the scoring are canned examples until the real
// model + rubric are wired in; both are labelled "Eksempeldata" on screen.
const replies: Record<string, string> = {
  t1: "Hej Jens\n\nTak for din tålmodighed, og undskyld at du har ventet. Din ordre bliver leveret torsdag den 29. oktober. Du får en mail med sporingsnummer, så snart den er sendt.\n\nRigtig god dag\nSofie",
  t5: "To påstande står ikke i rapporten:\n\n1. \"Salget steg 18 % i tredje kvartal.\" Rapporten nævner ingen procentsats.\n2. \"Alle afdelinger nåede deres mål.\" Rapporten siger, at to afdelinger ikke gjorde.",
  t6: "Tilbud: Nyt mødelokale-udstyr\n\nPris: 48.500 kr. ekskl. moms\nLevering: 3 uger efter accept\nForbehold: Prisen gælder i 30 dage. Montering uden for normal arbejdstid faktureres særskilt.",
};
const fallbackReply = "Her er AI'ens svar på din prompt. Læs det igennem, og ret prompten, hvis svaret ikke rammer.";

const criteria = [
  { label: "Klar opgave", value: 90 },
  { label: "Nok kontekst", value: 78 },
  { label: "Tjek af svaret", value: 84 },
];

export function Practice({ tasks, courseTitles }: { tasks: Task[]; courseTitles: Record<string, string> }) {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("opgave") ?? tasks[0].id;
  const task = tasks.find((t) => t.id === id) ?? tasks[0];
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const done = task.status === "Afleveret" || submitted[task.id];
  const score = task.score ?? 84;

  function pick(t: Task) {
    setPrompt("");
    setReply(null);
    router.replace(`/oevemiljoe?opgave=${t.id}`, { scroll: false });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <Card className="self-start">
        <div className="border-b border-[var(--border)] px-4 py-3 text-[0.8125rem] font-semibold text-heading">Opgaver</div>
        <ul>
          {tasks.map((t) => {
            const isDone = t.status === "Afleveret" || submitted[t.id];
            return (
              <li key={t.id} className="border-t border-[var(--border)] first:border-t-0">
                <button onClick={() => pick(t)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--hover-fill)] ${t.id === task.id ? "bg-[var(--hover-fill)]" : ""}`}>
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isDone ? "bg-[var(--coral)]" : t.status === "I gang" ? "bg-[var(--ink)]" : "bg-[var(--border-strong)]"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.8125rem] font-medium leading-snug text-heading">{t.title}</span>
                    <span className="mt-0.5 block truncate text-[0.6875rem] text-muted">{courseTitles[t.course]}</span>
                  </span>
                  {isDone ? <span className="text-[0.8125rem] font-bold text-heading">{t.score ?? 84}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Chip tone={done ? "soft" : task.status === "I gang" ? "ink" : "grey"}>{done ? "Afleveret" : task.status}</Chip>
              <span className="flex items-center gap-1 text-[0.6875rem] text-muted"><ClockIcon size={13} /> {task.minutes} min</span>
            </div>
            <h2 className="text-[1.125rem] font-semibold text-heading">{task.title}</h2>
            <Link href={`/kurser/${task.course}`} className="text-[0.75rem] text-muted hover:text-heading">{courseTitles[task.course]}</Link>
          </div>
          <Demo />
        </div>

        <Card className="p-5">
          <h3 className="text-[0.8125rem] font-semibold text-heading">Opgaven</h3>
          <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-text">{task.brief}</p>
        </Card>

        {done ? (
          <Card dark className="mt-3 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[0.75rem] text-[#b8a8a1]">Din score</div>
                <div className="mt-1 text-[2.5rem] font-bold leading-none tracking-[-0.03em] text-white">{score}<span className="ml-1 text-[0.875rem] font-normal text-[#b8a8a1]">/ 100</span></div>
              </div>
              <button onClick={() => setSubmitted((s) => ({ ...s, [task.id]: false }))} className="app-btn bg-white text-[var(--ink)] hover:bg-[#f3eeeb]">Prøv igen</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {criteria.map((c) => (
                <div key={c.label}>
                  <div className="mb-1.5 flex justify-between text-[0.75rem]"><span className="text-[#d3c6c0]">{c.label}</span><span className="font-semibold text-white">{c.value}</span></div>
                  <Bar value={c.value} dark />
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-white/10 pt-4 text-[0.8125rem] leading-relaxed text-[#d3c6c0]">
              Godt arbejde. Opgaven er tydelig, og du beder om et bestemt format. Giv AI&apos;en ét eksempel på jeres tone, så rammer svaret endnu tættere næste gang.
            </p>
          </Card>
        ) : (
          <>
            <Card className="mt-3 p-5">
              <label htmlFor="prompt" className="text-[0.8125rem] font-semibold text-heading">Din prompt</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="Skriv din prompt til AI'en her …"
                className="app-input mt-2 w-full resize-y rounded-[6px] p-3 text-[0.8125rem] leading-relaxed text-heading outline-none placeholder:text-muted"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[0.6875rem] text-muted">{prompt.trim() ? `${prompt.trim().split(/\s+/).length} ord` : "Tip: rolle, opgave og format"}</span>
                <div className="flex gap-2">
                  <button
                    disabled={!prompt.trim()}
                    onClick={() => setReply(replies[task.id] ?? fallbackReply)}
                    className="app-btn app-btn-light disabled:opacity-40"
                  >
                    <SparkleIcon size={14} /> Prøv prompten
                  </button>
                  <button
                    disabled={!reply}
                    onClick={() => setSubmitted((s) => ({ ...s, [task.id]: true }))}
                    className="app-btn app-btn-primary disabled:opacity-40"
                  >
                    Aflever <PaperPlaneRightIcon size={14} />
                  </button>
                </div>
              </div>
            </Card>

            <Card className="mt-3 p-5">
              <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-heading">
                <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-[var(--ink)] text-white"><SparkleIcon size={13} weight="fill" /></span>
                AI&apos;ens svar
              </div>
              {reply ? (
                <p className="mt-3 whitespace-pre-line text-[0.8125rem] leading-relaxed text-text">{reply}</p>
              ) : (
                <p className="mt-3 text-[0.8125rem] text-muted">Svaret vises her, når du har prøvet din prompt. Ret prompten, til du er tilfreds, og aflever så.</p>
              )}
              {reply ? (
                <p className="mt-4 flex items-center gap-1.5 border-t border-[var(--border)] pt-3 text-[0.6875rem] text-muted">
                  Tjek svaret, før du afleverer: står der noget, der ikke passer? <ArrowRightIcon size={12} />
                </p>
              ) : null}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
