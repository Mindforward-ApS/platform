"use client";

import { useMemo, useState } from "react";
import { BookmarkSimpleIcon, CaretDownIcon, FunnelSimpleIcon, MagnifyingGlassIcon, QuestionIcon } from "@phosphor-icons/react";
import { CourseCard } from "./CourseCard";
import { PageHeader, SectionTitle } from "./ui";
import type { Course } from "@/content/academy";

const sorts = ["Mest populære", "Korteste først", "Nyeste"] as const;

export function CourseBrowser({ rows, progress, saved }: { rows: { title: string; courses: Course[] }[]; progress: Record<string, number>; saved: string[] }) {
  const [mine, setMine] = useState(false);
  const [onlySaved, setOnlySaved] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof sorts)[number]>("Mest populære");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .map((r) => {
        let list = r.courses.filter(
          (c) =>
            (!mine || progress[c.slug] !== undefined) &&
            (!onlySaved || saved.includes(c.slug)) &&
            (!needle || `${c.title} ${c.summary} ${c.category}`.toLowerCase().includes(needle)),
        );
        if (sort === "Korteste først") list = [...list].sort((a, b) => a.minutes - b.minutes);
        if (sort === "Nyeste") list = [...list].reverse();
        return { ...r, courses: list };
      })
      .filter((r) => r.courses.length);
  }, [rows, mine, onlySaved, q, sort, progress, saved]);

  return (
    <>
      <PageHeader
        title="Kurser"
        sub="Find det kursus, du har brug for, og øv dig på det samme sted."
        actions={
        <button
          onClick={() => setMine((v) => !v)}
          aria-pressed={mine}
          className="flex h-10 items-center gap-3 rounded-[12px] bg-[var(--accent-soft)] px-3 text-[0.8125rem] text-heading"
        >
          <span className={`relative h-5 w-9 rounded-full transition-colors ${mine ? "bg-[var(--coral)]" : "bg-[var(--ink)]"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${mine ? "left-[1.125rem]" : "left-0.5"}`} />
          </span>
          Vis kun mine kurser
          <QuestionIcon size={16} className="text-muted" />
        </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="app-input flex h-9 w-full max-w-sm items-center gap-2 rounded-[6px] px-3 text-[0.8125rem]">
          <MagnifyingGlassIcon size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg i kurser" className="w-full bg-transparent text-heading outline-none placeholder:text-muted" />
        </label>
        <div className="flex items-center gap-2 text-[0.8125rem]">
          <span className="text-muted">Sortér:</span>
          <label className="app-btn app-btn-light relative cursor-pointer">
            {sort} <CaretDownIcon size={13} />
            <select value={sort} onChange={(e) => setSort(e.target.value as (typeof sorts)[number])} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Sortér">
              {sorts.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <button aria-label="Filtrér" className="app-btn app-btn-light !w-9 !p-0"><FunnelSimpleIcon size={15} /></button>
          <button
            aria-label="Vis gemte kurser"
            aria-pressed={onlySaved}
            onClick={() => setOnlySaved((v) => !v)}
            className={`app-btn !w-9 !p-0 ${onlySaved ? "bg-[var(--coral)] text-white" : "app-btn-light"}`}
          >
            <BookmarkSimpleIcon size={15} weight={onlySaved ? "fill" : "regular"} />
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-16 text-center text-[0.8125rem] text-muted">Ingen kurser passer til din søgning.</p>
      ) : (
        shown.map((row) => (
          <section key={row.title} className="mt-8">
            <SectionTitle title={row.title} href="/kurser" />
            <div className="app-scroll grid grid-cols-[repeat(4,minmax(15.5rem,1fr))] gap-3 overflow-x-auto pb-1">
              {row.courses.map((c) => <CourseCard key={c.slug} course={c} progress={progress[c.slug]} saved={saved.includes(c.slug)} />)}
            </div>
          </section>
        ))
      )}
    </>
  );
}
