"use client";

// First onboarding screen, three versions (Marco 2026-11-11: "meget mere grafisk fedt … 3 versioner af første step").
// A · Fotokort   — two tall full-bleed photo cards on the dark stage (Revolut / Airbnb account-type pick).
// B · Mørk scene — giant condensed headline, two glass cards that tilt toward the pointer, a coral glow that follows
//                  it, each card with a small live product piece (Linear / Arc).
// C · Delt skærm — the screen split into two colour fields with huge words and a cut-out person; the half you point
//                  at grows (Lunar).
// Picking a side continues to the onboarding (/onboarding-ny?type=…). Photos: the website's mood photos (AI-made /
// stock, never presented as customers).
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";

type Kind = "privat" | "virksomhed";
const c = { ink: "#201613", coral: "#e8664a", peach: "#f6c9b6", cream: "#f7f2ee", dark: "#201613" };
const bebas = "font-[family-name:var(--font-bebas)] uppercase leading-[0.9] tracking-[0.005em]";

function useGo() {
  const r = useRouter();
  const [picked, setPicked] = useState<Kind | null>(null);
  const go = (k: Kind) => { setPicked(k); setTimeout(() => r.push(`/onboarding-ny?type=${k}`), 550); };
  return { picked, go };
}
const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

/* A · Fotokort */
export function A() {
  const { picked, go } = useGo();
  const cards = [
    { k: "privat" as Kind, t: "Til mig selv", d: "Lær AI i dit eget tempo, 10 minutter om dagen.", img: "/img/onb/hero-hjem.jpg", pos: "70% 40%", tag: "Privat" },
    { k: "virksomhed" as Kind, t: "Til min virksomhed", d: "Træn hele holdet, og følg med som leder.", img: "/img/onb/hero-erhverv-2.jpg", pos: "60% 40%", tag: "Erhverv" },
  ];
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden px-5 py-6 sm:px-10" style={{ background: c.dark }}>
      <div aria-hidden className="absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: c.coral }} />
      <MindforwardLogo size={28} className="relative" />
      <div className="relative mx-auto flex w-full max-w-[72rem] flex-1 flex-col justify-center py-6">
        <p className="text-center text-[0.875rem] font-medium text-white/60">Velkommen til Mindforward</p>
        <h1 className="mt-3 text-center text-[clamp(2.25rem,1.5rem+3vw,4rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white">Hvem skal lære AI?</h1>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {cards.map((x) => {
            const on = picked === x.k, off = picked && !on;
            return (
              <button key={x.k} type="button" onClick={() => go(x.k)}
                className={`group relative aspect-[4/5] overflow-hidden rounded-[28px] text-left transition-all duration-500 md:aspect-auto md:h-[max(26rem,calc(100svh-19rem))] ${off ? "scale-[0.97] opacity-40" : ""} ${on ? "ring-4 ring-[#e8664a]" : "ring-1 ring-white/10 hover:ring-white/30"}`}>
                <Image src={x.img} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" style={{ objectPosition: x.pos }} />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#140c0a] via-[#140c0a]/40 to-transparent" />
                <span className="absolute left-6 top-6 rounded-full bg-white/15 px-3 py-1 text-[0.8125rem] font-semibold text-white backdrop-blur">{x.tag}</span>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-7">
                  <div>
                    <p className="text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">{x.t}</p>
                    <p className="mt-2 max-w-[22rem] text-[1rem] text-white/75">{x.d}</p>
                  </div>
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white transition-all duration-300 group-hover:scale-110 group-hover:bg-[#e8664a]" style={{ color: c.ink }}>{on ? "✓" : <Arrow />}</span>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-8 text-center text-[0.875rem] text-white/50">Har du allerede en konto? <span className="font-semibold text-white underline underline-offset-4">Log ind</span></p>
      </div>
    </div>
  );
}

/* B · Mørk scene */
function Tilt({ children, onClick, active, dim }: { children: React.ReactNode; onClick: () => void; active: boolean; dim: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [t, setT] = useState({ x: 0, y: 0, mx: 50, my: 50 });
  return (
    <button ref={ref} type="button" onClick={onClick}
      onPointerMove={(e) => { const r = ref.current!.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height; setT({ x: (py - 0.5) * -10, y: (px - 0.5) * 12, mx: px * 100, my: py * 100 }); }}
      onPointerLeave={() => setT({ x: 0, y: 0, mx: 50, my: 50 })}
      className={`group relative overflow-hidden rounded-[28px] border p-8 text-left transition-[opacity,box-shadow] duration-500 ${dim ? "opacity-30" : ""}`}
      style={{ transform: `perspective(1000px) rotateX(${t.x}deg) rotateY(${t.y}deg)`, transition: "transform 200ms ease-out, opacity 500ms", borderColor: active ? c.coral : "rgba(255,255,255,0.12)", background: "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))", boxShadow: active ? "0 0 0 3px #e8664a, 0 40px 80px -30px rgba(232,102,74,0.6)" : "0 40px 80px -40px rgba(0,0,0,0.8)" }}>
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(420px circle at ${t.mx}% ${t.my}%, rgba(232,102,74,0.28), transparent 60%)` }} />
      <div className="relative">{children}</div>
    </button>
  );
}
export function B() {
  const { picked, go } = useGo();
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden px-5 py-6 sm:px-10" style={{ background: "radial-gradient(120% 80% at 50% 0%, #3a2420 0%, #1a0f0c 55%, #0f0907 100%)" }}>
      <div aria-hidden className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(60% 50% at 50% 30%, black, transparent)", WebkitMaskImage: "radial-gradient(60% 50% at 50% 30%, black, transparent)" }} />
      <MindforwardLogo size={28} className="relative" />
      <div className="relative mx-auto flex w-full max-w-[64rem] flex-1 flex-col justify-center py-10">
        <h1 className={`${bebas} text-center text-[clamp(3.5rem,2rem+7vw,8.5rem)] text-white`}>Hvem skal <span style={{ color: c.coral }}>træne?</span></h1>
        <p className="mx-auto mt-4 max-w-[30rem] text-center text-[1.0625rem] text-white/60">Vælg én. Vi indretter platformen efter dit svar.</p>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Tilt onClick={() => go("privat")} active={picked === "privat"} dim={!!picked && picked !== "privat"}>
            <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em]" style={{ color: c.coral }}>Privat</p>
            <p className={`${bebas} mt-3 text-[3.25rem] text-white`}>Mig selv</p>
            <div className="mt-6 flex items-center gap-4 rounded-[18px] bg-white/[0.06] p-4">
              <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden><circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" /><circle cx="28" cy="28" r="23" fill="none" stroke="#e8664a" strokeWidth="6" strokeLinecap="round" strokeDasharray="104 145" transform="rotate(-90 28 28)" /></svg>
              <div><p className="text-[0.75rem] text-white/50">Din uge</p><p className="text-[1.125rem] font-semibold text-white">40 af 50 min</p></div>
            </div>
            <p className="mt-6 flex items-center gap-2 text-[0.9375rem] font-semibold text-white">Lær i dit eget tempo <Arrow /></p>
          </Tilt>
          <Tilt onClick={() => go("virksomhed")} active={picked === "virksomhed"} dim={!!picked && picked !== "virksomhed"}>
            <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em]" style={{ color: c.coral }}>Erhverv</p>
            <p className={`${bebas} mt-3 text-[3.25rem] text-white`}>Hele holdet</p>
            <div className="mt-6 rounded-[18px] bg-white/[0.06] p-4">
              {[["SL", "Sofie", 92], ["MH", "Mads", 86], ["IB", "Ida", 79]].map(([i, n, s]) => (
                <div key={n as string} className="flex items-center gap-3 py-1">
                  <span className="grid size-7 place-items-center rounded-full bg-white/15 text-[0.6875rem] font-bold text-white">{i}</span>
                  <span className="w-14 text-[0.875rem] text-white/80">{n}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full" style={{ width: `${s}%`, background: c.coral }} /></span>
                  <span className="w-7 text-right text-[0.8125rem] font-semibold text-white">{s}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-2 text-[0.9375rem] font-semibold text-white">Træn holdet, følg med <Arrow /></p>
          </Tilt>
        </div>
        <p className="mt-8 text-center text-[0.75rem] text-white/40">Tallene er eksempler</p>
      </div>
    </div>
  );
}

/* C · Delt skærm */
export function C() {
  const { picked, go } = useGo();
  const [hover, setHover] = useState<Kind | null>(null);
  const grow = (k: Kind) => (picked ? (picked === k ? 3 : 0.0001) : hover === k ? 1.35 : hover ? 0.75 : 1);
  const halves = [
    { k: "privat" as Kind, word: "Mig", sub: "Til mig selv", d: "Lær AI i dit eget tempo.", bg: c.peach, ink: c.ink, img: "/img/onb/whiteboard-cut.webp", w: 870, h: 1500, photo: false },
    { k: "virksomhed" as Kind, word: "Os", sub: "Til min virksomhed", d: "Træn hele holdet, og følg med.", bg: c.dark, ink: "#fff", img: "/img/onb/team.jpg", w: 1800, h: 1200, photo: true },
  ];
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden md:flex-row">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="rounded-full bg-[#201613] px-3 py-2"><MindforwardLogo size={24} /></span>
        <p className="rounded-full bg-white px-4 py-2 text-[0.875rem] font-semibold" style={{ color: c.ink }}>Hvem skal lære AI?</p>
      </div>
      {halves.map((x) => (
        <button key={x.k} type="button" onClick={() => go(x.k)} onPointerEnter={() => setHover(x.k)} onPointerLeave={() => setHover(null)}
          className="group relative flex min-h-[50svh] flex-col justify-end overflow-hidden p-8 text-left sm:p-12 md:min-h-svh"
          style={{ flexGrow: grow(x.k), flexBasis: 0, background: x.bg, color: x.ink, transition: "flex-grow 700ms cubic-bezier(.16,1,.3,1)" }}>
          <span aria-hidden className={`${bebas} pointer-events-none absolute -left-4 top-16 z-[1] select-none text-[clamp(10rem,22vw,26rem)] opacity-[0.12] transition-transform duration-700 group-hover:translate-x-6`}>{x.word}</span>
          {x.photo ? (
            <>
              {/* Business half: the team photo, darkened from the bottom so the text reads (no second cut-out person). */}
              <Image src={x.img} alt="" fill sizes="50vw" className="pointer-events-none object-cover opacity-60 transition-transform duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]" />
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#140c0a] via-[#140c0a]/50 to-[#140c0a]/10" />
            </>
          ) : (
            <Image src={x.img} alt="" width={x.w} height={x.h} className="pointer-events-none absolute bottom-0 right-[4%] h-[78%] w-auto object-contain transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-3 group-hover:scale-[1.03]" />
          )}
          <div className="relative z-10 max-w-[22rem]">
            <p className={`${bebas} text-[clamp(3.5rem,2.5rem+3vw,6rem)]`}>{x.sub}</p>
            <p className="mt-3 text-[1.0625rem] opacity-75">{x.d}</p>
            <span className="mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[0.9375rem] font-semibold transition group-hover:gap-3" style={{ background: x.k === "privat" ? c.dark : c.coral, color: x.k === "privat" ? "#fff" : c.ink }}>Vælg <Arrow /></span>
          </div>
        </button>
      ))}
    </div>
  );
}
