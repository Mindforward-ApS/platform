"use client";

// "Godt gået" when a course is finished (Marco 2026-11-15): Sofie, the AI tutor, congratulates the learner over a dimmed
// dashboard, with the course result, the certificate and the next step. Preview only; nothing is saved.
import Image from "next/image";
import { useEffect, useState } from "react";

const c = { ink: "#201613", muted: "#6b625d", coral: "#e8664a", peach: "#fbe1d7", cream: "#f5efe8", line: "rgba(32,22,19,0.1)" };

// Coral, peach and brown confetti that falls once.
function Confetti() {
  const bits = Array.from({ length: 70 }, (_, k) => ({ l: (k * 37) % 100, d: (k % 10) * 0.12, s: 6 + (k % 4) * 2, c: [c.coral, c.peach, "#c9a48f", c.ink, "#f2b39b"][k % 5], r: (k * 47) % 360 }));
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {bits.map((b, k) => <span key={k} className="kk-bit absolute top-[-20px] block" style={{ left: `${b.l}%`, width: b.s, height: b.s * 0.45, background: b.c, animationDelay: `${b.d}s`, transform: `rotate(${b.r}deg)` }} />)}
    </div>
  );
}

function Btn({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a href={href} className="inline-flex h-12 items-center justify-center rounded-[14px] px-6 text-[0.9375rem] font-semibold text-white transition-[transform,box-shadow] duration-150 active:translate-y-[4px] active:shadow-[0_2px_0_#b8452e]"
      style={{ background: "linear-gradient(180deg,#f07a5d,#e8664a)", boxShadow: "0 6px 0 #b8452e, 0 10px 14px -6px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.4)", textShadow: "0 1px 2px rgba(110,100,96,.45)" }}>{children}</a>
  );
}

export function KursusKlaret() {
  const [open, setOpen] = useState(true);
  useEffect(() => { const t = setTimeout(() => document.getElementById("kk-title")?.focus(), 50); return () => clearTimeout(t); }, []);
  return (
    <div className="min-h-svh" style={{ background: c.cream }}>
      {/* Stand-in for the dashboard behind the dialog. */}
      <div aria-hidden className="grid min-h-svh grid-cols-[240px_1fr] gap-3 p-3 opacity-60">
        <div className="rounded-[16px]" style={{ background: "#2c1f1b" }} />
        <div className="grid grid-rows-[60px_280px_1fr] gap-3">{[0, 1, 2].map((k) => <div key={k} className="rounded-[16px] bg-white" />)}</div>
      </div>
      {open && (
        <>
          <Confetti />
          <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(32,22,19,0.55)] p-4 backdrop-blur-[3px]">
            <div role="dialog" aria-modal="true" aria-labelledby="kk-title" className="kk-in my-auto grid w-full max-w-[880px] overflow-hidden rounded-[28px] bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)] md:grid-cols-[0.95fr_1.05fr]">
              {/* Sofie */}
              <div className="relative h-[240px] md:h-auto md:min-h-[520px]" style={{ background: "#f7f1f0" }}>
                <Image src="/img/sofie/tommel.png" alt="Sofie, AI-tutor, giver en tommel op" fill priority sizes="(min-width: 768px) 420px, 100vw" className="object-cover object-[45%_18%]" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[0.75rem] font-semibold backdrop-blur" style={{ color: c.ink }}>
                  <span className="size-1.5 rounded-full" style={{ background: c.coral }} />Sofie · AI-tutor
                </span>
              </div>
              {/* Message, result, next step */}
              <div className="flex flex-col p-7 sm:p-9">
                <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em]" style={{ color: c.coral }}>Kursus klaret</p>
                <h1 id="kk-title" tabIndex={-1} className="mt-2 text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] outline-none" style={{ color: c.ink }}>Godt gået, Anna!</h1>
                {/* Sofie's speech bubble */}
                <div className="relative mt-5 rounded-[18px] rounded-tl-[6px] px-5 py-4" style={{ background: c.peach }}>
                  <p className="text-[0.9375rem] leading-relaxed" style={{ color: c.ink }}>Du har klaret <b>Fra helt grøn til ekspert i ChatGPT</b>. Du blev rigtig skarp til at fjerne personoplysninger. Næste gang øver vi at give ChatGPT et eksempel med, så svarene rammer endnu bedre.</p>
                </div>
                <dl className="mt-6 grid grid-cols-3 gap-3">
                  {[["86", "Gns. score"], ["7/7", "Lektioner"], ["1 t 12 m", "Øvetid"]].map(([v, l]) => (
                    <div key={l} className="rounded-[14px] border px-3 py-3" style={{ borderColor: c.line }}>
                      <dt className="text-[0.75rem]" style={{ color: c.muted }}>{l}</dt>
                      <dd className="mt-0.5 text-[1.25rem] font-semibold tracking-[-0.02em]" style={{ color: c.ink }}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex items-center gap-3 rounded-[14px] px-4 py-3" style={{ background: c.cream }}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.coral} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" /></svg></span>
                  <div className="min-w-0 flex-1"><p className="text-[0.875rem] font-semibold" style={{ color: c.ink }}>Dit kursusbevis er klar</p><p className="text-[0.75rem]" style={{ color: c.muted }}>Med navn, score og et ID, der kan tjekkes via QR-koden</p></div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
                  <Btn href="#">Se dit kursusbevis</Btn>
                  <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-[14px] px-5 text-[0.9375rem] font-semibold transition hover:bg-black/5" style={{ color: c.ink }}>Næste kursus →</button>
                </div>
                <p className="mt-4 text-[0.6875rem]" style={{ color: c.muted }}>Eksempeldata i preview.</p>
              </div>
            </div>
          </div>
        </>
      )}
      {!open && <button type="button" onClick={() => setOpen(true)} className="fixed bottom-6 right-6 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow">Vis igen</button>}
      <style>{`
        @keyframes kkFall { 0% { transform: translateY(-20px) rotate(0); opacity: 1 } 100% { transform: translateY(110vh) rotate(540deg); opacity: .9 } }
        .kk-bit { animation: kkFall 2.6s cubic-bezier(.2,.6,.4,1) forwards; }
        @keyframes kkIn { from { opacity: 0; transform: translateY(16px) scale(.97) } to { opacity: 1; transform: none } }
        .kk-in { animation: kkIn .5s cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) { .kk-bit { display: none } .kk-in { animation: none } }
      `}</style>
    </div>
  );
}
