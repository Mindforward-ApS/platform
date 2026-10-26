import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/admin-ui";
import { Avatar, HeroCard, HeroChips, HeroMeta, HeroTitle } from "@/components/ui/cards";
import { Icon } from "@/components/ui/icons";
import { Badge, EmptyState, Notice, ProgressBar, Stat, Table, TextLink, type Tone } from "@/components/ui/primitives";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { employeeDetail } from "@/server/admin/queries";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";

// V4: one employee's progress — modules (status, best score, date) and certificates. No answers, no prompts.

const MODULE_LOOK: Record<string, { tone: Tone; icon: "dash" | "clock" | "check" | "x" }> = {
  ASSIGNED: { tone: "neutral", icon: "dash" },
  IN_PROGRESS: { tone: "accent", icon: "clock" },
  PASSED: { tone: "success", icon: "check" },
  REMOVED: { tone: "neutral", icon: "x" },
};
const MEMBER_LOOK = {
  NOT_STARTED: { tone: "neutral", icon: "dash" },
  IN_PROGRESS: { tone: "accent", icon: "clock" },
  CERTIFIED: { tone: "success", icon: "award" },
} as const;

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await guardPage(async () => {
    const c = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(c.membership.organizationId);
    return c;
  }, `/virksomhed/medarbejdere/${id}`);
  const detail = await employeeDetail(db(), ctx.membership.organizationId, { memberId: id });
  if (!detail) notFound();
  const t = getMessages().orgAdmin;
  const c = t.members.columns;
  const { row, modules } = detail;
  const look = MEMBER_LOOK[row.status];
  return (
    <>
      <TextLink href="/virksomhed/medarbejdere" className="inline-flex items-center gap-1.5 self-start text-body-sm">
        <Icon name="arrowLeft" />
        {t.detail.back}
      </TextLink>

      <HeroCard
        aside={
          <div className="self-start">
            <span className="inline-flex rounded-full bg-surface">
              <StatusBadge tone={look.tone} icon={look.icon}>
                {t.members.status[row.status]}
              </StatusBadge>
            </span>
          </div>
        }
      >
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={row.name} email={row.email} size="lg" onHero />
          <div className="flex min-w-0 flex-col">
            <HeroTitle as="h2">{format(t.detail.title, { name: row.name || row.email })}</HeroTitle>
            <HeroChips items={[t.roles[row.role], ...(row.jobRole ? [t.jobRoles[row.jobRole]] : []), ...row.tracks.map((x) => x.name)]} />
          </div>
        </div>
        <HeroMeta items={[{ icon: "mail", text: row.email }]} />
      </HeroCard>

      <section aria-label={t.detail.summaryTitle} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={c.score} value={row.avgBestScorePct === null ? t.members.none : `${row.avgBestScorePct} %`} />
        <Stat label={c.passed} value={row.passedCount} hint={row.lastPassedAt ? format(t.members.passedLatest, { date: formatDateDa(row.lastPassedAt) }) : undefined} />
        <Stat label={c.certificates} value={row.certificates.length} />
        <Stat label={c.lastActivity} value={<span className="text-title-2 normal-nums">{formatDateDa(row.lastActivityAt) || t.members.none}</span>} />
      </section>

      <Notice tone="info" icon="lock" title={t.detail.privacyTitle}>
        {t.detail.privacyNote}
      </Notice>

      <section className="flex flex-col gap-3" data-testid="employee-modules">
        <h2 className="text-title-3 text-ink">{t.detail.modules}</h2>
        {modules.length === 0 ? (
          <EmptyState icon="grid" title={t.detail.noModules} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th scope="col">{t.detail.module}</th>
                <th scope="col">{t.detail.status}</th>
                <th scope="col" className="text-right">
                  {t.detail.bestScore}
                </th>
                <th scope="col" className="text-right">
                  {t.detail.passedAt}
                </th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => {
                const ml = MODULE_LOOK[m.status] ?? MODULE_LOOK.ASSIGNED!;
                return (
                  <tr key={m.slug}>
                    <td className="min-w-48 font-medium">{m.title}</td>
                    <td>
                      <Badge tone={ml.tone} icon={ml.icon}>
                        {t.detail.assignmentStatus[m.status as keyof typeof t.detail.assignmentStatus] ?? m.status}
                      </Badge>
                    </td>
                    <td className="text-right tabular-nums">{m.bestScorePct === null ? t.members.none : `${m.bestScorePct} %`}</td>
                    <td className="text-right whitespace-nowrap">{formatDateDa(m.passedAt) || t.members.none}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </section>

      <Section title={t.detail.certificates}>
        {row.certificates.length === 0 ? (
          <p className="text-body-sm text-ink-muted">{t.members.none}</p>
        ) : (
          <ul className="-mx-6 -my-6 flex flex-col divide-y divide-line sm:-mx-7">
            {row.certificates.map((cert) => (
              <li key={`${cert.trackName}-${cert.level}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <span className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-md bg-success-soft text-success">
                    <Icon name="award" />
                  </span>
                  <span className="text-body text-ink">
                    {cert.trackName} · {cert.levelLabel}
                  </span>
                </span>
                <span className="text-body-sm text-ink-muted">{formatDateDa(cert.issuedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={getMessages().courses.admin.title} description={getMessages().courses.admin.description}>
        {detail.courses.length === 0 ? (
          <p className="text-body-sm text-ink-muted">{getMessages().courses.admin.none}</p>
        ) : (
          <ul className="-mx-6 -my-6 flex flex-col divide-y divide-line sm:-mx-7" data-testid="member-courses">
            {detail.courses.flatMap((course) =>
              course.modules.map((m) => {
                const label = format(getMessages().courses.admin.progress, { done: m.completed, total: m.total });
                return (
                  <li key={`${course.courseSlug}-${m.nr}`} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <span className="text-body text-ink">
                      {course.toolName} · {format(getMessages().courses.admin.module, { nr: m.nr, title: m.title })}
                    </span>
                    <span className="flex items-center gap-3 sm:w-64">
                      <ProgressBar value={m.completed} max={m.total} tone="success" label={label} />
                      <span className="shrink-0 text-body-sm text-ink-muted tabular-nums">{label}</span>
                    </span>
                  </li>
                );
              }),
            )}
          </ul>
        )}
      </Section>
    </>
  );
}

export default function EmployeeDetailPage(props: PageProps<"/virksomhed/medarbejdere/[id]">) {
  return (
    <AdminShell title={getMessages().orgAdmin.members.title}>
      <Suspense>
        <Content params={props.params} />
      </Suspense>
    </AdminShell>
  );
}
