import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseDisclaimer, CourseFrame, CourseMain, Stage, WebButtonLink, WebCard } from "@/components/courses/course-ui";
import { Icon } from "@/components/ui/icons";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getModuleCompletion, isCourseSlug } from "@/server/courses/service";
import { db } from "@/server/db";

// Module ending, reached with "Næste" from the module's last lesson. Website look (:3400).

async function Completion({ params }: { params: Promise<{ spor: string; modul: string }> }) {
  const { spor, modul } = await params;
  if (!isCourseSlug(spor)) notFound();
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/forloeb/${spor}/modul/${modul}`);
  const c = await getModuleCompletion(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, spor, modul);
  if (!c) notFound();
  const t = getMessages().courses.done;
  const complete = c.missing.length === 0;

  return (
    <CourseFrame>
      <CourseMain narrow>
        <Stage data-testid="module-done">
          <div className="flex flex-col items-start gap-5" data-complete={complete}>
            <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-linear-to-b from-web-coral-from to-web-coral-to text-web-white shadow-[0_10px_30px_-10px_var(--color-web-glow)]">
              <Icon name={complete ? "trophy" : "clock"} size={26} />
            </span>
            <h1 className="text-[2.25rem] leading-[1.08] font-normal tracking-[-0.035em] text-web-white sm:text-[3rem]">{format(complete ? t.title : t.notYetTitle, { nr: c.module.nr })}</h1>
            <p className="max-w-xl text-[1.0625rem] text-web-stage-text">{complete ? format(t.body, { total: c.total, title: c.module.title }) : format(t.notYetBody, { count: c.missing.length })}</p>
            {complete && (
              <WebButtonLink href={`/forloeb/${c.courseSlug}`} icon="arrowLeft" className="mt-2">
                {t.back}
              </WebButtonLink>
            )}
          </div>
        </Stage>
        {!complete && (
          <WebCard>
            <ul className="-my-2 flex flex-col divide-y divide-web-line">
              {c.missing.map((l) => (
                <li key={l.slug}>
                  <Link href={`/forloeb/${c.courseSlug}/${l.slug}`} className="flex items-center gap-3 py-3 text-[0.9375rem] text-web-ink hover:text-web-coral-ink">
                    <span className="w-10 text-[0.8125rem] text-web-muted tabular-nums">{l.nr}</span>
                    <span className="flex-1">{l.title}</span>
                    <Icon name="chevronRight" size={14} className="text-web-muted" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <WebButtonLink href={`/forloeb/${c.courseSlug}`} look="light" icon="arrowLeft">
                {t.back}
              </WebButtonLink>
            </div>
          </WebCard>
        )}
        <CourseDisclaimer text={c.disclaimer} />
      </CourseMain>
    </CourseFrame>
  );
}

export default function ModuleCompletionPage(props: PageProps<"/forloeb/[spor]/modul/[modul]">) {
  return (
    <Suspense>
      <Completion params={props.params} />
    </Suspense>
  );
}
