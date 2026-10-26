import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseDisclaimer } from "@/components/courses/course-ui";
import { AppIcon, Icon } from "@/components/ui/icons";
import { ButtonLink, Card } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getModuleCompletion, isCourseSlug } from "@/server/courses/service";
import { db } from "@/server/db";

// Module ending, reached with "Næste" from the module's last lesson.

async function Completion({ params }: { params: Promise<{ spor: string; modul: string }> }) {
  const { spor, modul } = await params;
  if (!isCourseSlug(spor)) notFound();
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/forloeb/${spor}/modul/${modul}`);
  const c = await getModuleCompletion(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, spor, modul);
  if (!c) notFound();
  const t = getMessages().courses.done;
  const complete = c.missing.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-8 pb-16 sm:px-6 in-[.app-panel]:mx-0 lg:in-[.app-panel]:px-11 lg:in-[.app-panel]:pt-6">
      <Card>
        <div className="flex flex-col items-start gap-4" data-testid="module-done" data-complete={complete}>
          <AppIcon name={complete ? "trophy" : "clock"} size="lg" />
          <h1 className="text-title-1 text-ink">{format(complete ? t.title : t.notYetTitle, { nr: c.module.nr })}</h1>
          <p className="text-body text-ink-muted">{complete ? format(t.body, { total: c.total, title: c.module.title }) : format(t.notYetBody, { count: c.missing.length })}</p>
          {!complete && (
            <ul className="flex w-full flex-col divide-y divide-line rounded-md border border-line">
              {c.missing.map((l) => (
                <li key={l.slug}>
                  <Link href={`/forloeb/${c.courseSlug}/${l.slug}`} className="flex items-center gap-3 px-4 py-3 text-body-sm text-ink hover:bg-sunken">
                    <span className="w-9 font-mono text-mono text-ink-subtle tabular-nums">{l.nr}</span>
                    <span className="flex-1">{l.title}</span>
                    <Icon name="chevronRight" size={14} className="text-ink-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <ButtonLink href={`/forloeb/${c.courseSlug}`} icon="arrowLeft" variant={complete ? "primary" : "secondary"}>
            {t.back}
          </ButtonLink>
        </div>
      </Card>
      <CourseDisclaimer text={c.disclaimer} />
    </main>
  );
}

export default function ModuleCompletionPage(props: PageProps<"/forloeb/[spor]/modul/[modul]">) {
  return (
    <Suspense>
      <Completion params={props.params} />
    </Suspense>
  );
}
