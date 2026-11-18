// Kursusbeviser · version B "Samling" (Marco 2026-11-03: "Samling den er vanvittigt").
// All certificates as a wall of cards: the earned one in full colour (approved V7 design) with share actions,
// the ones in progress as a faded V7 behind a lock, with progress. Pattern: Coursera / LinkedIn Learning accomplishments.
import Link from "next/link";
import { ArrowRightIcon, CopyIcon, DownloadSimpleIcon, LinkedinLogoIcon, LockSimpleIcon, SealCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { CertFit } from "@/components/app/certifikat/CertFit";
import { CertV7, type CertData } from "@/components/app/certifikat/CertV7";
import { Demo } from "@/components/app/ui";
import { all, fmtMin, O } from "@/content/kurser-view";

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

// ——— B · Samling ———
export function Samling() {
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

