// Three versions of the certificates page (Marco 2026-11-03: "Version V7 men lav flere versioner af certifikater siden").
// All show the approved V7 certificate. Patterns:
// A Udstilling — credential page (Credly / Accredible): the certificate large, actions + verification beside it.
// B Samling — accomplishments shelf (Coursera / LinkedIn Learning): earned and coming certificates as a wall of cards.
// C Næste bevis — a brown stage with the certificate as an object, and the road to the next one.
// Demo data; /beviser is untouched.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRightIcon, CheckIcon, CopyIcon, DownloadSimpleIcon, LinkedinLogoIcon, LockSimpleIcon, SealCheckIcon, ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { CertFit } from "@/components/app/certifikat/CertFit";
import { CertV7, type CertData } from "@/components/app/certifikat/CertV7";
import { Cover } from "@/components/app/kurser/Cover";
import { Demo } from "@/components/app/ui";
import { all, fmtMin, GREEN, O } from "@/content/kurser-view";

const VS = ["a", "b", "c"] as const;
export function generateStaticParams() {
  return VS.map((v) => ({ v }));
}

const earnedCourse = all.find((c) => c.status === "Færdig")!;
const cert: CertData = {
  name: "Sofie Lund",
  course: earnedCourse.title,
  level: "Niveau 1",
  skills: ["Personoplysninger", "Anonymisering før deling", "Virksomhedens AI-politik", "Kundedata"],
  hours: "1 time",
  date: "14. oktober 2026",
  id: "MF-26-04812",
  verifyUrl: "https://mindforward.dk/c/MF-26-04812",
  signer: "Marco Nielsen",
  signerTitle: "Stifter, Mindforward",
  score: "92 %",
  tasks: String(earnedCourse.tasks),
};
const coming = all.filter((c) => c.status === "I gang").sort((a, b) => b.p - a.p);
const notStarted = all.filter((c) => c.status === "Ikke startet");
const card = "relative min-w-0 rounded-[16px] bg-white";

function Actions({ dark }: { dark?: boolean }) {
  return (
    <div className="grid gap-2">
      <button className={`inline-flex h-11 items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold transition hover:-translate-y-px ${dark ? "bg-white text-[#201613]" : "bg-[#201613] text-white"}`}><LinkedinLogoIcon size={17} weight="fill" />Del på LinkedIn</button>
      <div className="grid grid-cols-2 gap-2">
        <button className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-[12.5px] font-medium ${dark ? "bg-white/10 text-white hover:bg-white/15" : "border border-[#ece4df] text-heading hover:bg-[#f7f2ee]"}`}><DownloadSimpleIcon size={15} />Hent PDF</button>
        <button className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-[12.5px] font-medium ${dark ? "bg-white/10 text-white hover:bg-white/15" : "border border-[#ece4df] text-heading hover:bg-[#f7f2ee]"}`}><CopyIcon size={15} />Kopiér link</button>
      </div>
    </div>
  );
}

function Coming({ compact }: { compact?: boolean }) {
  return (
    <ul className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
      {coming.map((c) => (
        <li key={c.slug}>
          <Link href={`/kurser/${c.slug}`} className="flex items-center gap-3 rounded-[12px] border border-[#f1e9e4] bg-white p-2.5 transition hover:border-[#e6d9d2]">
            <Cover slug={c.slug} sizes="56px" className="size-12 shrink-0 rounded-[9px]" icon={22} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[13px] font-semibold text-heading">{c.title}</b>
              <span className="mt-1.5 flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="block h-full rounded-full" style={{ width: `${c.p}%`, background: O }} /></span><span className="text-[11px] font-semibold tabular-nums text-heading">{c.p}%</span></span>
              <small className="mt-1 block text-[11px] text-muted">{c.total - c.done} lektioner og {Math.max(0, c.tasks - c.tasksDone)} opgaver til beviset · ca. {fmtMin(c.minutesLeft)}</small>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ——— A · Udstilling ———
function A() {
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-end justify-between gap-3 px-1 pt-1">
        <div><h1 className="text-[28px] font-semibold leading-none tracking-[-0.025em] text-heading">Kursusbeviser</h1><p className="mt-1.5 text-[12.5px] text-muted">1 optjent · {coming.length} på vej</p></div>
        <Demo />
      </header>
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${card} p-4`}>
          <div className="overflow-hidden rounded-[10px] shadow-[0_20px_50px_-24px_rgba(32,22,19,.45)] ring-1 ring-[#efe6e1]"><CertFit><CertV7 d={cert} /></CertFit></div>
        </div>
        <aside className="flex flex-col gap-3">
          <div className={`${card} p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Certifikat</p>
            <h2 className="mt-1 text-[18px] font-semibold leading-tight text-heading">{cert.course}</h2>
            <p className="mt-1 text-[12.5px] text-muted">{cert.level} · bestået {cert.date}</p>
            <div className="mt-4"><Actions /></div>
          </div>
          <div className={`${card} p-5`}>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-heading"><ShieldCheckIcon size={17} weight="fill" style={{ color: GREEN }} />Kan tjekkes af alle</p>
            <dl className="mt-3 grid gap-2 text-[12.5px]">
              {[["Certifikat-ID", cert.id], ["Udstedt", cert.date], ["Score", cert.score ?? "–"], ["Link", cert.verifyUrl.replace("https://", "")]].map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-[#f3eeeb] pb-2 last:border-0"><dt className="text-muted">{k}</dt><dd className="truncate font-medium text-heading">{v}</dd></div>)}
            </dl>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-[13px] font-semibold text-heading">Færdigheder</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">{cert.skills.map((s) => <li key={s} className="rounded-full bg-[#f7f2ee] px-3 py-1 text-[12px] text-heading">{s}</li>)}</ul>
          </div>
        </aside>
      </section>
      <section className={`${card} p-[18px]`}>
        <h2 className="text-[15.5px] font-semibold text-heading">På vej</h2>
        <p className="text-[11.5px] text-muted">Beviset låses op, når alle lektioner og opgaver er færdige</p>
        <div className="mt-3"><Coming /></div>
      </section>
    </div>
  );
}

// ——— B · Samling ———
function B() {
  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
        <div><h1 className="text-[28px] font-semibold leading-none tracking-[-0.025em] text-heading">Kursusbeviser</h1><p className="mt-1.5 text-[12.5px] text-muted">Din samling. Hvert bevis kan deles og tjekkes med sit ID.</p></div>
        <div className="flex items-center gap-2">
          {[["1", "optjent"], [String(coming.length), "på vej"], [String(notStarted.length), "ikke startet"]].map(([n, l]) => <span key={l} className="rounded-full bg-white px-3.5 py-1.5 text-[12px] text-muted"><b className="font-semibold text-heading">{n}</b> {l}</span>)}
          <Demo />
        </div>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <li className={`${card} flex flex-col p-3`}>
          <div className="overflow-hidden rounded-[10px] ring-1 ring-[#efe6e1]"><CertFit><CertV7 d={cert} /></CertFit></div>
          <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2f8a5c]"><SealCheckIcon size={14} weight="fill" />Optjent {cert.date}</p>
            <h2 className="mt-1 text-[15px] font-semibold leading-tight text-heading">{cert.course}</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">{cert.level} · score {cert.score} · {cert.id}</p>
            <div className="mt-auto pt-3"><Actions /></div>
          </div>
        </li>
        {coming.map((c) => (
          <li key={c.slug} className={`${card} flex flex-col p-3`}>
            <Link href={`/kurser/${c.slug}`} className="group relative block overflow-hidden rounded-[10px] ring-1 ring-[#efe6e1]">
              {/* The certificate this course leads to, faded until it is earned. */}
              <div className="opacity-35 grayscale"><CertFit><CertV7 d={{ ...cert, course: c.title, date: "—", score: "—", tasks: "—", hours: "—", skills: [], id: "Låst", verifyUrl: "https://mindforward.dk" }} /></CertFit></div>
              <div className="absolute inset-0 grid place-items-center"><span className="grid size-14 place-items-center rounded-full bg-white text-heading shadow-[0_8px_24px_-8px_rgba(32,22,19,.35)]"><LockSimpleIcon size={20} weight="bold" /></span></div>
              <div className="absolute inset-x-4 bottom-4"><div className="h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full" style={{ width: `${c.p}%`, background: O }} /></div></div>
            </Link>
            <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
              <p className="text-[11px] font-semibold tabular-nums" style={{ color: O }}>{c.p}% · på vej</p>
              <h2 className="mt-1 text-[15px] font-semibold leading-tight text-heading">{c.title}</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">{c.total - c.done} lektioner tilbage · ca. {fmtMin(c.minutesLeft)}</p>
              <div className="mt-auto pt-3"><Link href={`/kurser/${c.slug}/${c.next?.n ?? 1}`} className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#ece4df] text-[12.5px] font-semibold text-heading hover:bg-[#f7f2ee]">Fortsæt kurset <ArrowRightIcon size={13} weight="bold" /></Link></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ——— C · Næste bevis ———
function C() {
  const next = coming[0];
  return (
    <div className="flex flex-col gap-3">
      <section className="grid items-center gap-8 overflow-hidden rounded-[16px] p-6 text-white xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:p-10" style={{ background: "linear-gradient(160deg, #33231f 0%, #201613 55%, #1a0f0c 100%)" }}>
        <div className="relative">
          <div className="absolute -inset-10 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(226,100,63,.35), transparent)" }} />
          <div className="relative -rotate-[2.5deg] overflow-hidden rounded-[6px] shadow-[0_40px_80px_-30px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.06)]"><CertFit><CertV7 d={cert} /></CertFit></div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">Dit seneste bevis</p>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.03em] !text-white">{cert.course}</h1>
          <p className="mt-2 text-[13px] text-white/65">{cert.level} · bestået {cert.date} · score {cert.score}</p>
          <div className="mt-6 max-w-[360px]"><Actions dark /></div>
          <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-white/50"><ShieldCheckIcon size={14} />Andre kan tjekke det på {cert.verifyUrl.replace("https://", "")}</p>
        </div>
      </section>
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className={`${card} p-[18px]`}>
          <div className="flex items-start justify-between"><div><h2 className="text-[15.5px] font-semibold text-heading">Næste bevis</h2><p className="text-[11.5px] text-muted">Tættest på at blive færdig</p></div><Demo /></div>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative size-[96px] shrink-0">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="#f3eeeb" strokeWidth="9" /><circle cx="50" cy="50" r="42" fill="none" stroke={O} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(next.p / 100) * 263.9} 263.9`} /></svg>
              <span className="absolute inset-0 grid place-items-center text-[22px] font-semibold tabular-nums text-heading">{next.p}%</span>
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight text-heading">{next.title}</p>
              <ul className="mt-2 grid gap-1 text-[12px] text-heading">
                <li className="flex items-center gap-2"><span className="grid size-4 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={9} weight="bold" /></span>{next.done} af {next.total} lektioner</li>
                <li className="flex items-center gap-2"><span className="size-4 rounded-full border border-[#d9ccc5]" />{next.total - next.done} lektioner tilbage</li>
                <li className="flex items-center gap-2"><span className="size-4 rounded-full border border-[#d9ccc5]" />Afsluttende opgave</li>
              </ul>
            </div>
          </div>
          <Link href={`/kurser/${next.slug}/${next.next?.n ?? 1}`} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[13.5px] font-semibold text-white" style={{ background: O }}>Fortsæt: {next.next?.title} <ArrowRightIcon size={14} weight="bold" /></Link>
        </div>
        <div className={`${card} p-[18px]`}>
          <h2 className="text-[15.5px] font-semibold text-heading">Alle beviser på vej</h2>
          <p className="text-[11.5px] text-muted">{coming.length} i gang · {notStarted.length} ikke startet</p>
          <div className="mt-3"><Coming compact /></div>
        </div>
      </section>
    </div>
  );
}

function Switch({ v }: { v: string }) {
  const names: Record<string, string> = { a: "A · Udstilling", b: "B · Samling", c: "C · Næste bevis" };
  return (
    <nav aria-label="Skift version" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full bg-[#201613] p-1 text-[12px] text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]">
      {VS.map((k) => <Link key={k} href={`/beviser-forslag/${k}`} className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium ${k === v ? "bg-white text-[#201613]" : "text-white/75 hover:text-white"}`}><span className="sm:hidden">{k.toUpperCase()}</span><span className="hidden sm:inline">{names[k]}</span></Link>)}
    </nav>
  );
}

export default function Page(props: PageProps<"/beviser-forslag/[v]">) {
  return <Suspense fallback={<div className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: PageProps<"/beviser-forslag/[v]">["params"] }) {
  const { v } = await params;
  if (!VS.includes(v as (typeof VS)[number])) notFound();
  const Body = { a: A, b: B, c: C }[v as (typeof VS)[number]];
  return (
    <div data-kf className="pb-16">
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; }`}</style>
      <Body />
      <Switch v={v} />
    </div>
  );
}
