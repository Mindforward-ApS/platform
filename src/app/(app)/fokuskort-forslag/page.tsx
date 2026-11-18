// Preview round 3 for the slot where "Fokuskort" sits on /ny-oversigt (Marco 2026-11-02: "bare prøv 3 nye").
// Same size (about 740 × 195). No bars or lines. Example data from the øvemiljø.
import Link from "next/link";
import { ArrowRightIcon, CaretDownIcon, CheckIcon, ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { FocusMap } from "@/components/app/oversigt/Charts";

const O = "#e2643f";
const shell = "relative flex h-[195px] w-[740px] max-w-full flex-col overflow-hidden rounded-[16px] bg-white px-[18px] pb-4 pt-[18px]";
function Head({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">{title}</h4><small className="mt-px block text-[11.5px] text-muted">{sub}</small></div>
      {right}
    </div>
  );
}
const seeAll = (href: string, label = "Se alle") => <Link href={href} className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-[#f3eeeb] px-3 text-[11.5px] font-medium text-heading hover:bg-[#ebe4e0]">{label} <ArrowRightIcon size={12} /></Link>;

/* G · Seneste feedback: the last scored task, what went well and what to do better. */
function VersionG() {
  return (
    <div className={shell}>
      <Head title="Seneste feedback" sub="Fra øvemiljøet · i går" right={seeAll("/oevemiljoe", "Se opgaven")} />
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-[170px_1fr_1fr] gap-3">
        <div className="flex flex-col justify-between rounded-[12px] p-3.5 text-white" style={{ background: "linear-gradient(140deg, #3a2722 0%, #201613 100%)" }}>
          <p className="text-[11px] leading-snug text-white/70">Hvad må du dele?</p>
          <p className="flex items-baseline gap-1"><span className="text-[34px] font-semibold leading-none tracking-[-0.04em]">92</span><span className="text-[12px] text-white/60">/ 100</span></p>
          <span className="w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: O }}>Flot klaret</span>
        </div>
        <div className="rounded-[12px] bg-[#f7f2ee] p-3.5">
          <p className="text-[11px] font-semibold text-heading">Det gik godt</p>
          <ul className="mt-2 grid gap-1.5 text-[11.5px] text-heading">
            {["Du fjernede alle navne", "Du så CPR-nummeret", "Kort og klar begrundelse"].map((t) => <li key={t} className="flex items-start gap-1.5"><span className="mt-[1px] grid size-4 shrink-0 place-items-center rounded-full bg-[#5cbf8f] text-white"><CheckIcon size={9} weight="bold" /></span>{t}</li>)}
          </ul>
        </div>
        <div className="rounded-[12px] border border-[#f1e6df] p-3.5">
          <p className="text-[11px] font-semibold text-heading">Gør det endnu bedre</p>
          <ul className="mt-2 grid gap-1.5 text-[11.5px] text-heading">
            {["Tjek også adresser i fritekst", "Skriv hvorfor, ikke kun hvad"].map((t) => <li key={t} className="flex items-start gap-1.5"><span className="mt-[1px] grid size-4 shrink-0 place-items-center rounded-full text-white" style={{ background: O }}><ArrowUpRightIcon size={9} weight="bold" /></span>{t}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* H · Mine opgaver: the øvemiljø tasks as three tiles with status, tool and time. */
function VersionH() {
  const tasks = [
    { s: "I gang", t: "Skriv en mail til en kunde, der venter på svar", tool: "Copilot", min: 10, dark: true },
    { s: "Ny", t: "Tjek et AI-svar for fejl", tool: "ChatGPT", min: 9 },
    { s: "Afleveret", t: "Omskriv en dårlig prompt", tool: "Claude", min: 8, score: 86 },
  ];
  return (
    <div className={shell}>
      <Head title="Mine opgaver" sub="Øvemiljøet · 3 af 6" right={seeAll("/oevemiljoe")} />
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-3 gap-3">
        {tasks.map((k) => (
          <Link key={k.t} href="/oevemiljoe" className="group flex flex-col justify-between rounded-[12px] p-3.5 transition hover:-translate-y-0.5" style={{ background: k.dark ? "linear-gradient(140deg, #3a2722 0%, #201613 100%)" : "#f7f2ee", color: k.dark ? "#fff" : undefined }}>
            <div className="flex items-center justify-between">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: k.dark ? O : k.score ? "#e3f4ea" : "#fff", color: k.dark ? "#fff" : k.score ? "#2f7a4f" : "#201613" }}>{k.s}{k.score ? ` · ${k.score}` : ""}</span>
              <span className={`text-[10.5px] ${k.dark ? "text-white/60" : "text-muted"}`}>{k.min} min</span>
            </div>
            <p className={`line-clamp-2 text-[13px] font-semibold leading-snug ${k.dark ? "text-white" : "text-heading"}`}>{k.t}</p>
            <p className={`flex items-center justify-between text-[10.5px] ${k.dark ? "text-white/65" : "text-muted"}`}>{k.tool}<ArrowRightIcon size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" /></p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* I · Prik-kortet: the dot map from the CampusHub reference, with one plain sentence about what it means. */
function VersionI() {
  const days = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  return (
    <div className={shell}>
      <Head title="Fokuskort" sub="Hvornår du er mest fokuseret" right={<span className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-[#f3eeeb] pl-3 pr-2 text-[11.5px] font-medium text-heading">Denne uge <CaretDownIcon size={12} /></span>} />
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-[1fr_170px] gap-5">
        <div className="grid min-h-0 grid-rows-[1fr_16px]">
          <FocusMap />
          <div className="flex justify-between px-1 text-[10.5px] text-muted">{days.map((d) => <span key={d}>{d}</span>)}</div>
        </div>
        <div className="flex flex-col justify-center gap-1">
          <p className="text-[11px] text-muted">Mest fokus</p>
          <p className="text-[17px] font-semibold leading-tight tracking-[-0.02em] text-heading">Tirsdag og torsdag om morgenen</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">Lidt {["#f3efec", "#f9dccb", "#f6b49b", O].map((c) => <i key={c} className="size-2.5 rounded-full" style={{ background: c }} />)} Meget</div>
        </div>
      </div>
    </div>
  );
}

export default function FokuskortForslag() {
  const items = [
    { t: "G · Seneste feedback", d: "Din sidste opgave fra øvemiljøet: score, hvad der gik godt, og hvad du kan gøre bedre.", n: <VersionG /> },
    { t: "H · Mine opgaver", d: "Opgaverne i øvemiljøet som tre felter med status, værktøj og tid. Klik og gå i gang.", n: <VersionH /> },
    { t: "I · Prik-kortet", d: "Fokuskortet fra dit CampusHub-design, med én sætning om hvad det betyder.", n: <VersionI /> },
  ];
  return (
    <div data-dash-cream>
      <style>{`.app:has([data-dash-cream]), body:has([data-dash-cream]) { background: #f7f2ee; }`}</style>
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.015em] text-heading">Pladsen under Øvetid · 3 nye forslag</h1>
      <p className="mt-1 text-[0.8125rem] text-muted">Samme størrelse som pladsen på det nye dashboard. Alle tal er eksempler.</p>
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
