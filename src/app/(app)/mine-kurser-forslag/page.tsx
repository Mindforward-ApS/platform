// Preview: three versions of a "Mine kurser" card to replace Læringsrytme on the new dashboard (Marco 2026-11-02).
// Same size as that slot at 1440 px (about 730 × 230), header without an icon like Øvetid. Real course data.
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { courseBySlug, lessonsFor, progress } from "@/content/platform";

const O = "#e2643f", LINE = "#efe9e5";
const shell = "relative flex h-[230px] w-[730px] max-w-full flex-col overflow-hidden rounded-[16px] bg-white px-[18px] pb-4 pt-[18px]";

const mine = ["ai-paa-arbejdet", "gode-prompts", "excel-med-ai", "mails-og-tilbud"].map((s) => {
  const c = courseBySlug.get(s)!;
  const ls = lessonsFor(c);
  const done = ls.filter((l) => l.done).length;
  const next = ls.find((l) => !l.done);
  return { c, p: progress[s] ?? 0, done, total: ls.length, next };
});

// Real photo covers (Marco 2026-11-02: version A with real pictures instead of the icon boxes). Placeholders until
// there is one photo per course.
const covers: Record<string, string> = {
  "ai-paa-arbejdet": "/img/kurser/team.jpg",
  "gode-prompts": "/img/kurser/whiteboard.jpg",
  "excel-med-ai": "/img/kurser/feedback.jpg",
  "mails-og-tilbud": "/img/kurser/telefon.jpg",
};

function Head({ sub }: { sub: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Mine kurser</h4><small className="mt-px block text-[11.5px] text-muted">{sub}</small></div>
      <Link href="/kurser" className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-[#f3eeeb] px-3 text-[11.5px] font-medium text-heading hover:bg-[#ebe4e0]">Se alle <ArrowRightIcon size={12} /></Link>
    </div>
  );
}

function Bar({ p, hot }: { p: number; hot?: boolean }) {
  return <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: LINE }}><div className="h-full rounded-full" style={{ width: `${p}%`, background: hot ? O : "var(--ink)" }} /></div>;
}

/* A · Fire forsider: a row of course covers with progress, like a shelf. */
function VersionA() {
  return (
    <div className={shell}>
      <Head sub="4 kurser i gang" />
      <div className="mt-3 grid flex-1 grid-cols-4 gap-3">
        {mine.map((m, i) => (
          <Link key={m.c.slug} href={`/kurser/${m.c.slug}`} className="group flex min-w-0 flex-col">
            <div className="relative h-[72px] overflow-hidden rounded-[10px] transition-transform group-hover:-translate-y-0.5"><Image src={covers[m.c.slug]} alt="" fill sizes="180px" className="object-cover" /></div>
            <p className="mt-2 line-clamp-1 text-[12.5px] font-semibold text-heading">{m.c.title}</p>
            <p className="text-[10.5px] text-muted">{m.done} af {m.total} lektioner</p>
            <div className="mt-auto flex items-center gap-2"><Bar p={m.p} hot={i === 0} /><span className="text-[10.5px] font-semibold tabular-nums text-heading">{m.p}%</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}




/* A2 · Fotoforsider: real photo covers, category chip and a progress ring on the cover, the current course marked. */
function VersionA2() {
  const R = 13, C = 2 * Math.PI * R;
  return (
    <div className={shell}>
      <Head sub="Fortsæt, hvor du slap" />
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-4 gap-3">
        {mine.map((m, i) => (
          <Link key={m.c.slug} href={`/kurser/${m.c.slug}/${m.next?.n ?? 1}`} className="group relative flex min-w-0 flex-col overflow-hidden rounded-[12px] bg-[#f7f2ee] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(32,22,19,0.45)]">
            <div className="relative h-[74px] shrink-0 overflow-hidden">
              <Image src={covers[m.c.slug]} alt="" fill sizes="180px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[9.5px] font-semibold text-[#201613] backdrop-blur">{m.c.category}</span>
              <span className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-white/95">
                <svg viewBox="0 0 32 32" className="absolute inset-0 size-full -rotate-90"><circle cx="16" cy="16" r={R} fill="none" stroke={LINE} strokeWidth="3" /><circle cx="16" cy="16" r={R} fill="none" stroke={O} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(m.p / 100) * C} ${C}`} /></svg>
                <span className="text-[9px] font-bold tabular-nums text-[#201613]">{m.p}%</span>
              </span>
              {i === 0 && <span className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[9.5px] font-semibold text-white" style={{ background: O }}>I gang nu</span>}
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2 pt-2">
              <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-heading">{m.c.title}</p>
              <p className="mt-auto flex items-center justify-between gap-1 pt-1 text-[10px] text-muted"><span className="truncate">Næste: {m.next?.title ?? "Færdig"}</span><ArrowRightIcon size={11} weight="bold" className="shrink-0 text-heading transition-transform group-hover:translate-x-0.5" /></p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* A3 · Store forsider: the first course takes double width with the next lesson; three smaller covers beside it. */
function VersionA3() {
  const [cur, ...rest] = mine;
  return (
    <div className={shell}>
      <Head sub="4 kurser i gang" />
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-[2fr_1fr_1fr_1fr] gap-3">
        <Link href={`/kurser/${cur.c.slug}/${cur.next?.n ?? 1}`} className="group relative overflow-hidden rounded-[12px]">
          <Image src={covers[cur.c.slug]} alt="" fill sizes="280px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#201613]/90 via-[#201613]/30 to-transparent" />
          <div className="absolute inset-x-3 bottom-3 text-white">
            <p className="text-[10px] text-white/75">Næste lektion · {cur.next?.minutes} min</p>
            <p className="text-[14px] font-semibold leading-tight">{cur.next?.title}</p>
            <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full" style={{ width: `${cur.p}%`, background: O }} /></div><span className="text-[10px] font-semibold tabular-nums">{cur.done}/{cur.total}</span></div>
          </div>
          <span className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-semibold text-[#111]">Fortsæt <ArrowRightIcon size={12} weight="bold" /></span>
        </Link>
        {rest.map((m) => (
          <Link key={m.c.slug} href={`/kurser/${m.c.slug}`} className="group relative overflow-hidden rounded-[12px]">
            <Image src={covers[m.c.slug]} alt="" fill sizes="140px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#201613]/85 via-[#201613]/20 to-transparent" />
            <div className="absolute inset-x-2.5 bottom-2.5 text-white">
              <p className="line-clamp-2 text-[11.5px] font-semibold leading-tight">{m.c.title}</p>
              <div className="mt-1.5 flex items-center gap-1.5"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${m.p}%` }} /></div><span className="text-[9.5px] font-semibold tabular-nums">{m.p}%</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function MineKurserForslag() {
  const items = [
    { t: "A2 · Fotoforsider", d: "Rigtige fotos som forsider, kategori og fremskridtsring på forsiden, næste lektion under. Det kursus, du er i gang med, er markeret.", n: <VersionA2 /> },
    { t: "A3 · Stor + tre små", d: "Det kursus, du er i gang med, fylder dobbelt med næste lektion og Fortsæt. De tre andre som fotokort med fremskridt.", n: <VersionA3 /> },
    { t: "A · Første udgave (til sammenligning)", d: "Den, du valgte som bedst.", n: <VersionA /> },
  ];
  return (
    <div data-dash-cream>
      <style>{`.app:has([data-dash-cream]), body:has([data-dash-cream]) { background: #f7f2ee; }`}</style>
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.015em] text-heading">Mine kurser · A gjort bedre</h1>
      <p className="mt-1 text-[0.8125rem] text-muted">Erstatter Læringsrytme. Samme størrelse som pladsen på det nye dashboard. Kurser og fremskridt er platformens data.</p>
      <div className="mt-6 grid gap-8">
        {items.map((it) => (
          <section key={it.t} className="grid content-start gap-2">
            <div><p className="text-[0.9375rem] font-semibold text-heading">{it.t}</p><p className="text-[0.75rem] text-muted">{it.d}</p></div>
            {it.n}
          </section>
        ))}
      </div>
    </div>
  );
}
