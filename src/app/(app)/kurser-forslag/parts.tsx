// Small pieces shared by the three proposals: cover image, variant switcher, progress ring.
import Link from "next/link";
import { O, type Variant } from "./data";

export { Cover } from "@/components/app/kurser/Cover";

export function Ring({ value, size = 44, stroke = 4, track = "#efe6e1", color = O, children }: { value: number; size?: number; stroke?: number; track?: string; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

const names: Record<Variant, string> = { a: "A · Katalog", b: "B · Overblik", c: "C · Forløbet" };

// Floating switcher so Marco can jump between the versions and between the course list and a course's modules.
export function Switcher({ v, slug }: { v: Variant; slug?: string }) {
  const s = slug ?? "ai-paa-arbejdet";
  return (
    <nav aria-label="Skift version" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#201613] p-1 text-[12px] text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]">
      {(Object.keys(names) as Variant[]).map((k) => (
        <Link key={k} href={slug ? `/kurser-forslag/${k}/${s}` : `/kurser-forslag/${k}`} aria-current={k === v ? "page" : undefined} className={`rounded-full px-3 py-1.5 font-medium transition ${k === v ? "bg-white text-[#201613]" : "text-white/75 hover:text-white"}`}><span className="sm:hidden">{k.toUpperCase()}</span><span className="hidden whitespace-nowrap sm:inline">{names[k]}</span></Link>
      ))}
      <span className="mx-1 h-4 w-px bg-white/20" />
      <Link href={`/kurser-forslag/${v}`} aria-current={!slug ? "page" : undefined} className={`rounded-full px-3 py-1.5 font-medium ${!slug ? "bg-[#e2643f] text-white" : "text-white/75 hover:text-white"}`}>Kurser</Link>
      <Link href={`/kurser-forslag/${v}/${s}`} aria-current={slug ? "page" : undefined} className={`rounded-full px-3 py-1.5 font-medium ${slug ? "bg-[#e2643f] text-white" : "text-white/75 hover:text-white"}`}>Moduler</Link>
    </nav>
  );
}

// Same cream canvas as /ny-oversigt, scoped to these preview pages.
export function Cream() {
  return <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; } main > div:has(> [data-kf]) { padding-bottom: 5rem; }`}</style>;
}
