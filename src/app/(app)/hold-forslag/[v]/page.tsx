// Preview: three versions of "Mit hold" (Marco 2026-11-03). /hold is untouched.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { A, B, C } from "../Hold";
import { D, E, F } from "../Hold2";
import { G, H, I } from "@/components/app/hold/HoldListe";

const VS = ["a", "b", "c", "d", "e", "f", "g", "h", "i"] as const;
const ROUNDS = [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]];
export function generateStaticParams() {
  return VS.map((v) => ({ v }));
}

const names: Record<string, string> = { a: "A · Kort", b: "B · Tabel", c: "C · Puls", d: "D · Tavle", e: "E · Feed", f: "F · Lederens dag", g: "G · Afdelinger", h: "H · Liste", i: "I · Opmærksomhed" };

export default function Page(props: PageProps<"/hold-forslag/[v]">) {
  return <Suspense fallback={<div className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: PageProps<"/hold-forslag/[v]">["params"] }) {
  const { v } = await params;
  if (!VS.includes(v as (typeof VS)[number])) notFound();
  const Body = { a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I }[v as (typeof VS)[number]];
  // Each round shows only its own three versions in the switcher.
  const shown = ROUNDS.find((r) => r.includes(v)) ?? [];
  return (
    <div data-kf className="pb-16">
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; }`}</style>
      <Body />
      <nav aria-label="Skift version" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full bg-[#201613] p-1 text-[12px] text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]">
        {shown.map((k) => <Link key={k} href={`/hold-forslag/${k}`} className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium ${k === v ? "bg-white text-[#201613]" : "text-white/75 hover:text-white"}`}><span className="sm:hidden">{k.toUpperCase()}</span><span className="hidden sm:inline">{names[k]}</span></Link>)}
      </nav>
    </div>
  );
}
