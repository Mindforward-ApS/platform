import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { StatusBadge } from "@/components/admin/admin-ui";
import { Icon } from "@/components/ui/icons";
import { Badge, EmptyState, Notice, Stat, Table, TextLink, type Tone } from "@/components/ui/primitives";
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

      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sunken text-ink-muted ring-1 ring-inset ring-line">
            <Icon name="user" size={20} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-title-2 text-ink">{format(t.detail.title, { name: row.name || row.email })}</h2>
            <p className="truncate text-body-sm text-ink-muted">{row.email}</p>
            <p className="text-body-sm text-ink-muted">
              {t.roles[row.role]}
              {row.jobRole ? ` · ${t.jobRoles[row.jobRole]}` : ""}
              {row.tracks.length > 0 ? ` · ${row.tracks.map((x) => x.name).join(", ")}` : ""}
            </p>
          </div>
        </div>
        <div className="self-start">
          <StatusBadge tone={look.tone} icon={look.icon}>
            {t.members.status[row.status]}
          </StatusBadge>
        </div>
      </div>

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
          <ul className="-mx-6 -my-6 flex flex-col divide-y divide-line">
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
