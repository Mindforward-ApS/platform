// Preview: three versions of the course list (Marco 2026-11-03). /kurser is untouched.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KatalogA } from "../A";
import { KatalogB } from "../B";
import { KatalogC } from "../C";
import { VARIANTS, type Variant } from "../data";
import { Cream, Switcher } from "../parts";

export function generateStaticParams() {
  return VARIANTS.map((v) => ({ v }));
}

export default function Page(props: PageProps<"/kurser-forslag/[v]">) {
  return <Suspense fallback={<div className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: PageProps<"/kurser-forslag/[v]">["params"] }) {
  const { v } = await params;
  if (!VARIANTS.includes(v as Variant)) notFound();
  const K = { a: KatalogA, b: KatalogB, c: KatalogC }[v as Variant];
  return <div data-kf><Cream /><K /><Switcher v={v as Variant} /></div>;
}
