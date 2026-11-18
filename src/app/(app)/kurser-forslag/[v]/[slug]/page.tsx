// Preview: three versions of a course page with its modules (Marco 2026-11-03). /kurser/[slug] is untouched.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModulA } from "../../A";
import { ModulB } from "../../B";
import { ModulC } from "../../C";
import { all, bySlug, VARIANTS, type Variant } from "../../data";
import { Cream, Switcher } from "../../parts";

export function generateStaticParams() {
  return VARIANTS.flatMap((v) => all.map((c) => ({ v, slug: c.slug })));
}

export default function Page(props: PageProps<"/kurser-forslag/[v]/[slug]">) {
  return <Suspense fallback={<div className="h-96" />}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: PageProps<"/kurser-forslag/[v]/[slug]">["params"] }) {
  const { v, slug } = await params;
  const c = bySlug.get(slug);
  if (!VARIANTS.includes(v as Variant) || !c) notFound();
  const M = { a: ModulA, b: ModulB, c: ModulC }[v as Variant];
  return <div data-kf><Cream /><M c={c} /><Switcher v={v as Variant} slug={slug} /></div>;
}
