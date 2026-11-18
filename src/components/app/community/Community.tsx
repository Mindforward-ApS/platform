"use client";

// Community, in place of Beskeder (Marco 2026-11-11: "et community som man kan tilmelde sig … møde andre
// virksomheder … små webinars"). Layout of the usual community platforms: a join step first, then tabs for
// Opslag / Webinars with a right column (next webinar, rules). All content is example data.
// Marco 2026-11-11: members can't browse each other; a name (and, if they allow it, the company) only shows on a post.
import { useState } from "react";
import { Demo } from "@/components/app/ui";

const c = { ink: "#201613", muted: "#6b625d", coral: "#e8664a", coralText: "#b8452c", page: "#f7f2ee", line: "#ece4df", dark: "#201613", soft: "#fbe1d7" };
const cats = ["Alle", "Præsentér dig", "Spørgsmål", "Gode prompts", "Sådan gør vi"];
const posts = [
  { who: "Line Vestergaard", co: "Nordlys Logistik", init: "LV", cat: "Gode prompts", t: "Prompten der halverede vores kundesvar-tid", b: "Vi beder nu Copilot om at stille tre spørgsmål tilbage, før den skriver svaret. Det fjernede næsten alle omskrivninger. Prompten er her:", code: "Før du svarer kunden: stil mig tre spørgsmål om sagen, og vent på mine svar.", likes: 24, comments: 9, ago: "2 t" },
  { who: "Jonas Bak", co: "Bak & Søn VVS", init: "JB", cat: "Spørgsmål", t: "Må vi bruge ChatGPT til tilbud med kundens adresse?", b: "Vi er 8 i firmaet og vil gerne lave tilbud hurtigere. Hvordan håndterer I persondata, når I bruger AI til tilbud?", likes: 7, comments: 14, ago: "5 t" },
  { who: "Mette Krogh", co: "Krogh Revision", init: "MK", cat: "Præsentér dig", t: "Hej fra et revisionskontor i Aarhus", b: "Vi er 14 og er lige startet med Claude. Vil gerne høre fra andre i økonomi, der bruger AI til afstemninger.", likes: 18, comments: 6, ago: "i går" },
];
const webinars = [
  { d: "TOR", n: "14", m: "nov.", t: "AI og persondata: hvad må vi?", who: "Mindforward", time: "12.00–12.30 · online", seats: "38 tilmeldt" },
  { d: "TIR", n: "26", m: "nov.", t: "Copilot i Outlook: 5 ting, I kan i morgen", who: "Mindforward", time: "08.30–09.00 · online", seats: "21 tilmeldt" },
  { d: "ONS", n: "4", m: "dec.", t: "Sådan fik vi hele holdet med", who: "Nordlys Logistik fortæller", time: "15.00–15.45 · online", seats: "12 tilmeldt" },
];

function Avatar({ init, size = 40 }: { init: string; size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full text-[0.75rem] font-bold text-white" style={{ width: size, height: size, background: c.dark }}>{init}</span>;
}

function Join({ onJoin }: { onJoin: () => void }) {
  const [show, setShow] = useState(true);
  const [interests, setInterests] = useState<string[]>([]);
  const all = ["ChatGPT", "Copilot", "Claude", "Persondata og GDPR", "Salg og tilbud", "Kundeservice", "Økonomi", "Ledelse"];
  return (
    <div className="mx-auto grid max-w-[64rem] overflow-hidden rounded-[20px] bg-white lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between p-8 sm:p-10" style={{ background: "linear-gradient(160deg,#2e1f1c,#1a0f0c)" }}>
        <div>
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em]" style={{ color: c.coral }}>Mindforward Community</p>
          <h1 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-white">Lær AI sammen med andre danske virksomheder</h1>
          <ul className="mt-6 grid gap-3 text-[0.9375rem] text-white/80">
            {["Stil spørgsmål og del de prompts, der virker", "Korte webinars hver måned, også med andre kunder", "Lær af andre virksomheders erfaringer"].map((x) => <li key={x} className="flex gap-3"><span style={{ color: c.coral }}>✓</span>{x}</li>)}
          </ul>
        </div>
        <p className="mt-10 text-[0.8125rem] text-white/50">Gratis for alle med en Mindforward-konto.</p>
      </div>
      <div className="p-8 sm:p-10">
        <h2 className="text-[1.25rem] font-semibold" style={{ color: c.ink }}>Opret din profil</h2>
        <label className="mt-5 grid gap-1.5 text-[0.875rem] font-medium" style={{ color: c.ink }}>Navn i community
          <input defaultValue="Sofie Lund" className="h-11 rounded-[10px] border px-4 outline-none focus:border-[#e8664a]" style={{ borderColor: c.line }} />
        </label>
        <label className="mt-4 flex items-center justify-between gap-4 rounded-[12px] p-4 text-[0.9375rem]" style={{ background: c.page, color: c.ink }}>
          <span><span className="block font-medium">Vis min virksomhed ved mine opslag</span><span className="text-[0.8125rem]" style={{ color: c.muted }}>Dit navn vises kun, når du skriver noget. Der er ingen medlemsliste.</span></span>
          <button type="button" role="switch" aria-checked={show} onClick={() => setShow(!show)} className="relative h-6 w-11 shrink-0 rounded-full transition" style={{ background: show ? c.coral : "#d8cfc9" }}><span className="absolute top-0.5 size-5 rounded-full bg-white transition-all" style={{ left: show ? 22 : 2 }} /></button>
        </label>
        <p className="mt-5 text-[0.875rem] font-medium" style={{ color: c.ink }}>Hvad er du interesseret i?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {all.map((x) => { const on = interests.includes(x); return <button key={x} type="button" onClick={() => setInterests(on ? interests.filter((y) => y !== x) : [...interests, x])} className="rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition" style={{ borderColor: on ? c.coral : c.line, background: on ? c.soft : "#fff", color: on ? c.coralText : c.ink }}>{x}</button>; })}
        </div>
        <button type="button" onClick={onJoin} className="mt-7 h-12 w-full rounded-[10px] text-[0.9375rem] font-semibold" style={{ background: c.coral, color: c.ink }}>Tilmeld mig community</button>
        <p className="mt-3 text-center text-[0.75rem]" style={{ color: c.muted }}>Du kan altid skjule din profil eller melde dig ud under Indstillinger.</p>
      </div>
    </div>
  );
}

export function Community() {
  const [joined, setJoined] = useState(false);
  const [tab, setTab] = useState<"opslag" | "webinars">("opslag");
  const [cat, setCat] = useState("Alle");
  const [signed, setSigned] = useState<string[]>([]);
  if (!joined) return <div className="p-4 sm:p-6"><Join onJoin={() => setJoined(true)} /></div>;
  const shown = cat === "Alle" ? posts : posts.filter((p) => p.cat === cat);
  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]" style={{ color: c.ink }}>Community</h1><Demo /></div>
          <p className="text-[0.9375rem]" style={{ color: c.muted }}>214 medlemmer fra 37 virksomheder</p>
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1">
          {(["opslag", "webinars"] as const).map((t) => <button key={t} type="button" onClick={() => setTab(t)} className="rounded-full px-4 py-2 text-[0.875rem] font-medium capitalize transition" style={{ background: tab === t ? c.dark : "transparent", color: tab === t ? "#fff" : c.muted }}>{t}</button>)}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-4">
          {tab === "opslag" && (
            <>
              <div className="flex items-center gap-3 rounded-[16px] bg-white p-4">
                <Avatar init="SL" />
                <span className="h-11 flex-1 content-center rounded-full px-4 text-[0.9375rem]" style={{ background: c.page, color: c.muted }}>Skriv et opslag, stil et spørgsmål eller del en prompt …</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cats.map((x) => <button key={x} type="button" onClick={() => setCat(x)} className="rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition" style={{ background: cat === x ? c.dark : "#fff", color: cat === x ? "#fff" : c.ink }}>{x}</button>)}
              </div>
              {shown.map((p) => (
                <article key={p.t} className="rounded-[16px] bg-white p-5">
                  <div className="flex items-center gap-3">
                    <Avatar init={p.init} />
                    <div className="min-w-0 flex-1 leading-tight"><p className="text-[0.9375rem] font-semibold" style={{ color: c.ink }}>{p.who}</p><p className="text-[0.8125rem]" style={{ color: c.muted }}>{p.co} · {p.ago}</p></div>
                    <span className="rounded-full px-2.5 py-1 text-[0.75rem] font-medium" style={{ background: c.page, color: c.muted }}>{p.cat}</span>
                  </div>
                  <h3 className="mt-4 text-[1.0625rem] font-semibold" style={{ color: c.ink }}>{p.t}</h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed" style={{ color: c.muted }}>{p.b}</p>
                  {p.code && <p className="mt-3 rounded-[12px] p-4 font-mono text-[0.8125rem] leading-relaxed text-white" style={{ background: c.dark }}>{p.code}</p>}
                  <div className="mt-4 flex gap-5 text-[0.8125rem] font-medium" style={{ color: c.muted }}>
                    <span>{p.likes} synes godt om</span><span>{p.comments} svar</span>{p.code && <span className="ml-auto font-semibold" style={{ color: c.coralText }}>Prøv i øvemiljøet →</span>}
                  </div>
                </article>
              ))}
            </>
          )}
          {tab === "webinars" && (
            <>
              <h2 className="text-[1rem] font-semibold" style={{ color: c.ink }}>Kommende webinars</h2>
              {webinars.map((w) => { const on = signed.includes(w.t); return (
                <div key={w.t} className="flex flex-wrap items-center gap-4 rounded-[16px] bg-white p-4">
                  <div className="grid w-16 place-items-center rounded-[12px] py-2 text-center leading-tight" style={{ background: c.page }}><span className="text-[0.6875rem] font-semibold" style={{ color: c.coralText }}>{w.d}</span><span className="text-[1.5rem] font-semibold" style={{ color: c.ink }}>{w.n}</span><span className="text-[0.6875rem]" style={{ color: c.muted }}>{w.m}</span></div>
                  <div className="min-w-0 flex-1"><p className="font-semibold" style={{ color: c.ink }}>{w.t}</p><p className="text-[0.8125rem]" style={{ color: c.muted }}>{w.who} · {w.time} · {w.seats}</p></div>
                  <button type="button" onClick={() => setSigned(on ? signed.filter((x) => x !== w.t) : [...signed, w.t])} className="h-10 rounded-[10px] px-4 text-[0.875rem] font-semibold" style={on ? { background: c.page, color: c.ink } : { background: c.coral, color: c.ink }}>{on ? "✓ Tilmeldt" : "Tilmeld"}</button>
                </div>
              ); })}
              <h2 className="mt-4 text-[1rem] font-semibold" style={{ color: c.ink }}>Optagelser</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {["Kom godt i gang med ChatGPT", "Prompts til kundeservice"].map((t) => (
                  <div key={t} className="rounded-[16px] bg-white p-3">
                    <div className="grid aspect-video place-items-center rounded-[12px]" style={{ background: c.page, color: c.muted }}><span className="grid size-11 place-items-center rounded-full bg-white" style={{ color: c.coral }}>▶</span></div>
                    <p className="mt-3 px-1 font-semibold" style={{ color: c.ink }}>{t}</p><p className="px-1 pb-1 text-[0.8125rem]" style={{ color: c.muted }}>30 min · optaget i oktober</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-[16px] p-5 text-white" style={{ background: "linear-gradient(160deg,#2e1f1c,#1a0f0c)" }}>
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em]" style={{ color: c.coral }}>Næste webinar</p>
            <p className="mt-2 text-[1.125rem] font-semibold leading-snug">{webinars[0].t}</p>
            <p className="mt-1 text-[0.8125rem] text-white/60">Tor. 14. nov. · {webinars[0].time}</p>
            <button type="button" onClick={() => setTab("webinars")} className="mt-4 h-10 w-full rounded-[10px] text-[0.875rem] font-semibold" style={{ background: c.coral, color: c.ink }}>Se webinars</button>
          </div>
          <div className="rounded-[16px] bg-white p-5">
            <p className="font-semibold" style={{ color: c.ink }}>Husk</p>
            <ul className="mt-3 grid gap-2 text-[0.875rem]" style={{ color: c.muted }}>
              <li>Del aldrig kundedata eller persondata.</li>
              <li>Vær venlig. Alle er her for at lære.</li>
              <li>Salg og reklame hører ikke til her.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
