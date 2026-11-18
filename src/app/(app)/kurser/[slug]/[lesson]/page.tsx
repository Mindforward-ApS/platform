// Lesson page = version 5 "Fokus" (Marco 2026-11-03): Læs → Quiz (text hidden) → Prøv (can wait) → Færdig.
// The demo courses only have lesson titles, so the content is real Mindforward lesson content (ChatGPT module 1)
// shown as example content until each course has its own. Old video page backed up in the session scratchpad.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LektionFokus } from "@/components/app/lektion/Fokus";
import { courses } from "@/content/academy";
import { lektioner } from "@/content/lektioner";
import { courseBySlug, lessonsFor } from "@/content/platform";

export function generateStaticParams() {
  return courses.flatMap((c) => lessonsFor(c).map((l) => ({ slug: c.slug, lesson: String(l.n) })));
}

export async function generateMetadata(props: PageProps<"/kurser/[slug]/[lesson]">): Promise<Metadata> {
  const { slug, lesson } = await props.params;
  const c = courseBySlug.get(slug);
  const l = c ? lessonsFor(c)[Number(lesson) - 1] : undefined;
  return { title: l?.title ?? "Lektion" };
}

export default function LessonPage(props: PageProps<"/kurser/[slug]/[lesson]">) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content(props: { params: PageProps<"/kurser/[slug]/[lesson]">["params"] }) {
  const { slug, lesson } = await props.params;
  const course = courseBySlug.get(slug);
  if (!course) notFound();
  const lessons = lessonsFor(course);
  const n = Number(lesson);
  const l = lessons[n - 1];
  if (!l) notFound();
  const nxt = lessons[n];
  const sample = lektioner.chatgpt;
  const content = sample.lessons[(n - 1) % sample.lessons.length];

  return (
    <LektionFokus
      key={`${slug}-${n}`}
      lesson={content}
      tool={sample.tool}
      label={`${course.title} · Lektion ${n} af ${lessons.length}`}
      closeHref={`/kurser/${slug}`}
      next={nxt ? { href: `/kurser/${slug}/${nxt.n}`, title: sample.lessons[n % sample.lessons.length].title, minutes: nxt.minutes } : undefined}
      finishHref="/beviser"
      sample
    />
  );
}
