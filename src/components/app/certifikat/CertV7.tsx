// Certifikat V7 "Bevis" (approved by Marco 2026-10-23: "V7 er perfekt"), ported 2026-11-03 from
// mindforward-brain/materialer/certifikat-v7/CertVariants.tsx without design changes. A4 landscape (297 × 210 mm).
// Show it scaled with <CertFit>. The pen signature is drawn until Marco sends a scan of his real one.
import QRCode from "qrcode";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";
import { SilkWave } from "@/components/night/SilkWave";

export type CertData = {
  name: string;
  course: string;
  level: string;
  skills: string[];
  hours: string;
  date: string;
  id: string;
  verifyUrl: string;
  signer: string;
  signerTitle: string;
  score?: string;
  tasks?: string;
};

const ink = "#2a1b17";
const muted = "#7a6a64";
const page = { width: "297mm", height: "210mm" } as const;

async function qrSvg(url: string, dark: string) {
  return QRCode.toString(url, { type: "svg", margin: 0, color: { dark, light: "#00000000" } });
}

const stageBg =
  "radial-gradient(70% 55% at 50% 8%, #3d2c28 0%, #2e1f1c 35%, transparent 75%), radial-gradient(60% 70% at 72% 85%, #271d19 0%, transparent 70%), linear-gradient(180deg, #1f120f 0%, #1c100d 55%, #201613 100%)";
const coral = "#e1603e";

function Check({ size = "5.5mm" }: { size?: string }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full text-white" style={{ width: size, height: size, background: coral }}>
      <svg viewBox="0 0 24 24" className="size-[60%]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
    </span>
  );
}


// Dark seal on the ribbon: scalloped glowing coral rim, dark centre, a text ring and the brain mark.
function GlowSeal({ size }: { size: string }) {
  const teeth = 30;
  let rim = "";
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 ? 46.5 : 49.5;
    rim += `${i ? "L" : "M"}${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`;
  }
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size, filter: "drop-shadow(0 0 6mm rgba(236,111,69,0.55))" }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0" aria-hidden>
        <defs>
          <linearGradient id="gs-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6a07e" /><stop offset="1" stopColor="#c4462a" /></linearGradient>
          <path id="gs-ring" d="M50,50 m-30,0 a30,30 0 1,1 60,0 a30,30 0 1,1 -60,0" />
        </defs>
        <path d={rim + "Z"} fill="url(#gs-rim)" />
        <circle cx="50" cy="50" r="41" fill="#1a0f0c" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="#f6a07e" strokeOpacity="0.5" strokeWidth="0.6" />
        <text fontSize="7.4" fontWeight="500" letterSpacing="0.9" fill="#fff"><textPath href="#gs-ring">AI i praksis · Mindforward · AI i praksis ·</textPath></text>
      </svg>
      {/* our AI tile from the hero, exactly as made (brown gradient, inner highlight, light ring, gradient "AI" + spark), just round (Marco 2026-10-23) */}
      <div className="relative grid size-[20mm] place-items-center rounded-full bg-[linear-gradient(145deg,#4a2f27_0%,#33201b_100%)] shadow-[inset_0_0.3mm_0_rgba(255,220,200,.18),0_4mm_9mm_-3mm_rgba(14,8,6,.7)] ring-[1.1mm] ring-white/30">
        <span className="relative leading-none">
          <span className="bg-[linear-gradient(160deg,#ffd9b8_0%,#ff9a5c_45%,#e8643a_100%)] bg-clip-text text-[22pt] font-black tracking-[-0.06em] text-transparent [filter:drop-shadow(0_0_2.6mm_rgba(255,140,80,.45))]">AI</span>
          <span aria-hidden className="absolute -right-[2.6mm] -top-[1.6mm] text-[8.5pt] text-[#ffc89e]">✦</span>
        </span>
      </div>
    </div>
  );
}

// Hand-drawn "Marco Nielsen" pen signature (own drawing, quick scrawl like a real ballpoint signature).
// Drawn twice: a fuller stroke and a thin offset one, so the line weight varies like ink.
function PenSignature({ width = "70mm", color = "#1d2340" }: { width?: string; color?: string }) {
  const d = [
    "M18 74 C21 46 29 18 34 20 C39 22 35 58 38 71 C41 50 50 22 55 25 C60 28 54 62 58 69",
    "C62 52 67 50 71 57 C75 64 79 55 83 53 C87 51 90 62 96 59 C102 56 103 48 110 52 C114 55 116 60 121 58",
    "M131 76 C133 52 136 22 142 17 C147 13 144 52 152 72 C158 58 161 30 168 18",
    "C171 38 172 58 178 56 C183 54 185 45 191 49 C197 53 199 61 207 57 C214 53 218 44 227 48 C233 51 236 58 244 54",
    "M36 86 C96 77 178 75 266 64 C246 71 236 77 257 80",
  ].join(" ");
  return (
    <svg viewBox="0 0 280 100" style={{ width, height: "auto" }} fill="none" aria-label="Underskrift" role="img">
      <path d={d} stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
      <path d={d} stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" transform="translate(0.8 -0.6)" opacity="0.55" />
      <circle cx="172" cy="9" r="1.8" fill={color} />
    </svg>
  );
}

// V7 · Bevis: a dark top band (title + seal on its edge), a light lower part that reads like proof: stats, checks, verification box.
export async function CertV7({ d }: { d: CertData }) {
  const qr = await qrSvg(d.verifyUrl, ink);
  return (
    <div className="relative overflow-hidden" style={{ ...page, background: "#fffdfa", color: ink }}>
      {/* top band */}
      <div className="absolute inset-x-0 top-0 h-[70mm] overflow-hidden text-white" style={{ background: stageBg }}>
        {/* the hero's flowing line ribbon in the dark band (Marco 2026-10-23: no brain, no orange glow) */}
        <SilkWave />
        <div className="absolute left-[18mm] top-[14mm]"><MindforwardLogo size={26} /></div>
        <p className="absolute left-[18mm] top-[32mm] text-[11pt] text-white/70">Mindforward bekræfter, at</p>
        <p className="absolute left-[18mm] top-[40mm] text-[40pt] font-semibold leading-none tracking-[-0.03em]">{d.name}</p>
      </div>
      <div className="absolute right-[24mm] top-[70mm] -translate-y-1/2"><GlowSeal size="50mm" /></div>

      <div className="absolute inset-x-[18mm] bottom-[14mm] top-[82mm] flex flex-col">
        <p className="text-[16pt] leading-snug">har bestået <b className="font-semibold">{d.course} · {d.level}</b> den {d.date}</p>
        <div className="mt-[7mm] grid grid-cols-3 border-y" style={{ borderColor: "#eadfd6" }}>
          {[[d.score ?? "—", "Score"], [d.tasks ?? "—", "Opgaver løst i øvemiljøet"], [d.hours, "Praktisk træning"]].map(([v, l], i) => (
            <div key={l} className={`py-[4mm] ${i ? "border-l pl-[8mm]" : ""}`} style={{ borderColor: "#eadfd6" }}>
              <p className="text-[24pt] font-semibold leading-none tracking-[-0.03em]" style={{ color: i === 0 ? coral : ink }}>{v}</p>
              <p className="mt-[1.5mm] text-[9pt]" style={{ color: muted }}>{l}</p>
            </div>
          ))}
        </div>
        <ul className="mt-[6mm] flex flex-wrap gap-x-[8mm] gap-y-[2.5mm]">
          {d.skills.map((k) => <li key={k} className="flex items-center gap-[2.5mm] text-[10.5pt]"><Check size="5mm" />{k}</li>)}
        </ul>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <div className="-mb-[3mm] -rotate-2"><PenSignature width="64mm" /></div>
            <div className="mt-[2mm] h-px w-[60mm]" style={{ background: ink }} />
            <p className="mt-[1.5mm] text-[9pt]" style={{ color: muted }}>{d.signerTitle}</p>
          </div>
          <div className="flex items-center gap-[4mm] rounded-[3mm] border px-[4mm] py-[3mm]" style={{ borderColor: "#eadfd6" }}>
            <div className="size-[14mm]" dangerouslySetInnerHTML={{ __html: qr }} />
            <div>
              <p className="text-[8.5pt] uppercase tracking-[0.14em]" style={{ color: muted }}>Tjek certifikatet</p>
              <p className="mt-[1mm] text-[11pt] font-semibold">{d.id}</p>
              <p className="text-[8.5pt]" style={{ color: muted }}>{d.verifyUrl.replace("https://", "")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
