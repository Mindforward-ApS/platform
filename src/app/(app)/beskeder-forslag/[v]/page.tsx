// Preview: three versions of Beskeder (Marco 2026-11-03). /beskeder is untouched.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { M, N, Ov } from "../Besk";
import { Pv, Q, R } from "../Besk2";

const VS = ["m", "n", "o", "p", "q", "r"] as const;
const ROUNDS = [["m", "n", "o"], ["p", "q", "r"]];
export function generateStaticParams() {
  return VS.map((v) => ({ v }));
}
const names: Record<string, string> = { m: "M · Samtaler", n: "N · Indbakke", o: "O · Holdet", p: "P · Scene", q: "Q · Coach", r: "R · Rum" };

export default function Page(props: PageProps<"/beskeder-forslag/[v]">) {
  return <Suspense fallback={<div className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: PageProps<"/beskeder-forslag/[v]">["params"] }) {
  const { v } = await params;
  if (!VS.includes(v as (typeof VS)[number])) notFound();
  const Body = { m: M, n: N, o: Ov, p: Pv, q: Q, r: R }[v as (typeof VS)[number]];
  const shown = ROUNDS.find((x) => x.includes(v)) ?? [];
  return (
    <div data-kf className="pb-16">
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; }`}</style>
      <Body />
      <nav aria-label="Skift version" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full bg-[#201613] p-1 text-[12px] text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]">
        {shown.map((k) => <Link key={k} href={`/beskeder-forslag/${k}`} className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium ${k === v ? "bg-white text-[#201613]" : "text-white/75 hover:text-white"}`}><span className="sm:hidden">{k.toUpperCase()}</span><span className="hidden sm:inline">{names[k]}</span></Link>)}
      </nav>
    </div>
  );
}
