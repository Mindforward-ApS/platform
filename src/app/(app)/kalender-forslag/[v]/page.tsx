// Preview: three calendar versions (Marco 2026-11-03). /plan is untouched.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { J, K, L } from "@/components/app/kalender/Kalender";

const VS = ["j", "k", "l"] as const;
export function generateStaticParams() {
  return VS.map((v) => ({ v }));
}
const names: Record<string, string> = { j: "J · Måned", k: "K · Uge", l: "L · Plan" };

export default function Page(props: PageProps<"/kalender-forslag/[v]">) {
  return <Suspense fallback={<div className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: PageProps<"/kalender-forslag/[v]">["params"] }) {
  const { v } = await params;
  if (!VS.includes(v as (typeof VS)[number])) notFound();
  const Body = { j: J, k: K, l: L }[v as (typeof VS)[number]];
  return (
    <div data-kf className="pb-16">
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; }`}</style>
      <Body />
      <nav aria-label="Skift version" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full bg-[#201613] p-1 text-[12px] text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]">
        {VS.map((k) => <Link key={k} href={`/kalender-forslag/${k}`} className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium ${k === v ? "bg-white text-[#201613]" : "text-white/75 hover:text-white"}`}><span className="sm:hidden">{k.toUpperCase()}</span><span className="hidden sm:inline">{names[k]}</span></Link>)}
      </nav>
    </div>
  );
}
