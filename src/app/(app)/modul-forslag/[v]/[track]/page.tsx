// Preview: three new module-page versions on the real forløb data (Marco 2026-11-03). Nothing live is changed.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { tracks } from "@/content/forloeb";
import { Cream } from "../../../kurser-forslag/parts";
import { Switch, V1, V2, V3 } from "../../M";

export function generateStaticParams() {
  return ["1", "2", "3"].flatMap((v) => tracks.map((t) => ({ v, track: t.id })));
}

export default function Page(props: PageProps<"/modul-forslag/[v]/[track]">) {
  return <Suspense fallback={<div className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: PageProps<"/modul-forslag/[v]/[track]">["params"] }) {
  const { v, track } = await params;
  const t = tracks.find((x) => x.id === track);
  const V = { "1": V1, "2": V2, "3": V3 }[v];
  if (!t || !V) notFound();
  return <div data-kf><Cream /><V t={t} /><Switch v={v} track={track} /></div>;
}
