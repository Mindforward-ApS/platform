// Preview: three versions of the lesson page on real lesson content (Marco 2026-11-03). Nothing live is changed.
// 2a/2b/2c = three ways to go on to the next lesson in "Læs og øv" (Marco: "det med når man går videre … ikke godt nok").
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { lektioner } from "@/content/lektioner";
import { Cream } from "../../../kurser-forslag/parts";
import { L1, L2, L3, L4, Switch } from "../../L";
import { T5, T6, T7 } from "../../Trin";

const VS = ["1", "2", "3", "2a", "2b", "2c", "4", "5", "6", "7"];

export function generateStaticParams() {
  return VS.flatMap((v) => Object.keys(lektioner).map((track) => ({ v, track })));
}

export default function Page(props: PageProps<"/lektion-forslag/[v]/[track]">) {
  return <Suspense fallback={<div className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: PageProps<"/lektion-forslag/[v]/[track]">["params"] }) {
  const { v, track } = await params;
  if (!VS.includes(v) || !lektioner[track]) notFound();
  const body = v === "4" ? <L4 track={track} /> : v === "5" ? <T5 track={track} /> : v === "6" ? <T6 track={track} /> : v === "7" ? <T7 track={track} /> : v === "1" ? <L1 track={track} /> : v === "3" ? <L3 track={track} /> : <L2 track={track} nav={(v[1] ?? "a") as "a" | "b" | "c"} />;
  return <div data-kf><Cream />{body}<Switch v={v} track={track} /></div>;
}
