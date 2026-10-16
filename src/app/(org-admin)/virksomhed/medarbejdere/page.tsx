import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { Cell, CodeBox, StatusBadge } from "@/components/admin/admin-ui";
import { AdminSubmit } from "@/components/admin/danger-submit";
import { Avatar, RoleTag, Segments } from "@/components/ui/cards";
import { Icon } from "@/components/ui/icons";
import { Badge, Button, ButtonLink, EmptyState, Field, Notice, ProgressBar, Select, TextArea, TextLink, type Tone } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import type { JobRole } from "@/generated/prisma/enums";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { listEmployees, listOpenInvitations, listRemovedMembers, type EmployeeRow } from "@/server/admin/queries";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { getEntitlements } from "@/server/billing/entitlements";
import { db } from "@/server/db";
import { expectedTxtRecord } from "@/server/orgs/invitations";
import { seatsInUse } from "@/server/orgs/seats";
import {
  assignMember,
  cancelInvitation,
  changeMemberRole,
  checkDomain,
  createOrResetJoinLink,
  deleteDomain,
  inviteMembers,
  removeMember,
  restoreMember,
  saveDomain,
  turnOffJoinLink,
} from "./actions";

// Medarbejdere (design v3: people rows with avatar, role tag and segmented best score): status, best score, dates, certificates per employee (never answers or prompts), invitations by
// email/CSV, link and verified domain, track/job-role assignment, remove (frees the seat), seats used/limit.

const JOB_ROLES = ["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS", "OTHER"] as const;
const STATUS_LOOK: Record<EmployeeRow["status"], { tone: Tone; icon: "dash" | "clock" | "award" }> = {
  NOT_STARTED: { tone: "neutral", icon: "dash" },
  IN_PROGRESS: { tone: "accent", icon: "clock" },
  CERTIFIED: { tone: "success", icon: "award" },
};
// Desktop column template shared by the header and every row, so the list reads as one table.
const COLS = "md:grid md:grid-cols-[minmax(0,1.6fr)_7.5rem_minmax(0,1fr)_9.5rem_6.5rem_6rem_1.5rem] md:items-center md:gap-4";

type Search = { cursor?: string; spor?: string; jobrolle?: string; fejl?: string };

function TrackAndRoleFields({ tracks, row }: { tracks: { id: string; displayName: string; licenseTiers: string[] }[]; row?: EmployeeRow }) {
  const t = getMessages().orgAdmin;
  const current = row?.tracks[0];
  return (
    <>
      <Select label={t.members.assign.track} name="trackId" defaultValue={current?.id ?? ""}>
        <option value="">{t.members.assign.noTrack}</option>
        {tracks.map((tr) => (
          <option key={tr.id} value={tr.id}>
            {tr.displayName}
          </option>
        ))}
      </Select>
      <Select label={t.members.assign.tier} name="licenseTier" defaultValue={current?.licenseTier ?? ""}>
        <option value="">—</option>
        {(["COPILOT_CHAT", "COPILOT_M365", "UNKNOWN"] as const).map((tier) => (
          <option key={tier} value={tier}>
            {t.tiers[tier]}
          </option>
        ))}
      </Select>
      <Select label={t.members.assign.jobRole} name="jobRole" defaultValue={row?.jobRole ?? ""}>
        <option value="">{t.members.assign.noJobRole}</option>
        {JOB_ROLES.map((r) => (
          <option key={r} value={r}>
            {t.jobRoles[r]}
          </option>
        ))}
      </Select>
    </>
  );
}

function MemberRow({ r, tracks, canChangeRole }: { r: EmployeeRow; tracks: { id: string; displayName: string; licenseTiers: string[] }[]; canChangeRole: boolean }) {
  const t = getMessages().orgAdmin;
  const c = t.members.columns;
  const look = STATUS_LOOK[r.status];
  return (
    <li className="flex flex-col" data-testid="member-row">
      <div className={`grid grid-cols-2 gap-x-4 gap-y-3 px-6 py-4 sm:px-7 ${COLS}`}>
        <div className="col-span-2 flex min-w-0 items-center gap-3.5 md:col-span-1">
          <Avatar name={r.name} email={r.email} size="lg" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Link href={`/virksomhed/medarbejdere/${r.memberId}`} className="truncate text-body font-medium text-ink hover:text-accent">
                {r.name || r.email}
              </Link>
              <RoleTag role={r.role}>
                {t.roles[r.role]}
                <span className="sr-only"> ({c.role})</span>
              </RoleTag>
            </span>
            <span className="truncate text-body-sm text-ink-muted">{r.email}</span>
            <span className="text-caption text-ink-subtle">
              {r.jobRole ? t.jobRoles[r.jobRole] : ""}
              <span className="sr-only">
                {" "}
                ({c.jobRole}: {r.jobRole ? t.jobRoles[r.jobRole] : t.members.none})
              </span>
            </span>
          </div>
        </div>
        <Cell label={c.status}>
          <StatusBadge tone={look.tone} icon={look.icon} testId="member-status">
            {t.members.status[r.status]}
          </StatusBadge>
        </Cell>
        <Cell label={c.track}>
          <span className="block">{r.tracks.map((x) => x.name).join(", ") || t.members.none}</span>
          {r.certificates.length > 0 && (
            <span className="mt-1 flex flex-col gap-0.5">
              <span className="sr-only">{c.certificates}:</span>
              {r.certificates.map((cert) => (
                <span key={`${cert.trackName}-${cert.levelLabel}`} className="flex items-center gap-1 text-caption text-success">
                  <Icon name="award" size={12} />
                  <span>{`${cert.trackName} · ${cert.levelLabel}`}</span>
                </span>
              ))}
            </span>
          )}
        </Cell>
        <Cell label={t.members.scoreShort} align="end">
          <span className="flex items-center gap-2.5 md:justify-end">
            {r.avgBestScorePct !== null && <Segments pct={r.avgBestScorePct} label={`${t.members.scoreShort}: ${r.avgBestScorePct} %`} />}
            <span className="w-10 text-right font-medium tabular-nums">{r.avgBestScorePct === null ? t.members.none : `${r.avgBestScorePct} %`}</span>
          </span>
        </Cell>
        <Cell label={c.passed}>
          <span className="tabular-nums">{r.passedCount}</span>
          {r.lastPassedAt && (
            <span className="block text-caption whitespace-nowrap text-ink-muted">
              <span className="sr-only">{c.passedAt}: </span>
              {format(t.members.passedLatest, { date: formatDateDa(r.lastPassedAt) })}
            </span>
          )}
        </Cell>
        <Cell label={c.lastActivity}>
          <span className="whitespace-nowrap">{formatDateDa(r.lastActivityAt) || t.members.none}</span>
        </Cell>
        <div className="col-span-2 flex md:col-span-1 md:justify-end">
          <TextLink href={`/virksomhed/medarbejdere/${r.memberId}`} className="inline-flex items-center gap-1 text-body-sm md:grid md:size-6 md:place-items-center md:rounded-sm md:no-underline md:hover:bg-sunken">
            <span className="md:sr-only">{t.members.details}</span>
            <Icon name="chevronRight" />
          </TextLink>
        </div>
      </div>
      <details className="group/manage border-t border-dashed border-line">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-6 py-2.5 sm:px-7 text-label text-ink-muted transition-colors duration-[120ms] hover:bg-sunken hover:text-ink [&::-webkit-details-marker]:hidden">
          <Icon name="settings" />
          {t.members.manage}
          <Icon name="chevronDown" className="transition-transform duration-[120ms] group-open/manage:rotate-180" />
        </summary>
        <div className="flex flex-col gap-5 border-t border-line bg-sunken px-6 py-5 sm:px-7">
          <ActionForm action={assignMember} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <input type="hidden" name="memberId" value={r.memberId} />
            <TrackAndRoleFields tracks={tracks} row={r} />
            <SubmitButton variant="secondary">{t.members.assign.save}</SubmitButton>
          </ActionForm>
          {(canChangeRole || r.role !== "OWNER") && (
            <div className="flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between">
              {canChangeRole ? (
                <form action={changeMemberRole} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="memberId" value={r.memberId} />
                  <div className="w-56">
                    <Select label={t.members.changeRole} name="role" defaultValue={r.role}>
                      {(["LEARNER", "ADMIN", "OWNER"] as const).map((role) => (
                        <option key={role} value={role}>
                          {t.roles[role]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <SubmitButton variant="secondary">{t.members.save}</SubmitButton>
                </form>
              ) : (
                <span />
              )}
              {r.role !== "OWNER" && (
                <ActionForm action={removeMember} className="flex flex-col gap-3">
                  <input type="hidden" name="memberId" value={r.memberId} />
                  <AdminSubmit icon="x">{t.members.deactivate}</AdminSubmit>
                </ActionForm>
              )}
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Search> }) {
  const ctx = await guardPage(async () => {
    const c = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(c.membership.organizationId);
    return c;
  }, "/virksomhed/medarbejdere");
  const sp = await searchParams;
  const t = getMessages().orgAdmin;
  const orgId = ctx.membership.organizationId;
  const filter = {
    ...(sp.spor ? { trackId: sp.spor } : {}),
    ...(sp.jobrolle && (JOB_ROLES as readonly string[]).includes(sp.jobrolle) ? { jobRole: sp.jobrolle as JobRole } : {}),
  };
  const [page, pending, removed, tracks, org, ent, used] = await Promise.all([
    listEmployees(db(), orgId, { cursor: sp.cursor, filter }),
    listOpenInvitations(db(), orgId),
    listRemovedMembers(db(), orgId),
    db().track.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, displayName: true, licenseTiers: true } }),
    db().organization.findUniqueOrThrow({ where: { id: orgId }, select: { joinLinkEnabled: true, verifiedDomain: true, domainVerificationToken: true, domainVerifiedAt: true, dpaAcceptedAt: true } }),
    getEntitlements(db(), orgId),
    seatsInUse(db(), orgId),
  ]);
  const isOwner = ctx.membership.role === "OWNER";
  const qs = (extra: Record<string, string>) => `?${new URLSearchParams({ ...(sp.spor ? { spor: sp.spor } : {}), ...(sp.jobrolle ? { jobrolle: sp.jobrolle } : {}), ...extra })}`;
  const c = t.members.columns;

  return (
    <>
      {sp.fejl === "ejer" && <Notice tone="error">{t.errors.lastOwner}</Notice>}
      {!org.dpaAcceptedAt && (
        <Notice tone="error">
          {t.invite.dpaRequired}{" "}
          <TextLink href="/virksomhed/databehandleraftale" className="text-danger decoration-danger/40 hover:text-danger">
            {t.nav.dpa}
          </TextLink>
        </Notice>
      )}

      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-7">
        <p className="flex shrink-0 items-center gap-2 text-body-sm text-ink" data-testid="seat-usage">
          <Icon name="users" className="text-ink-muted" />
          {format(t.seats.usage, { used, limit: ent.seatLimit })}
        </p>
        <div className="flex-1">
          <ProgressBar value={used} max={ent.seatLimit} label={t.overview.seatsTitle} tone="accent" />
        </div>
        <TextLink href="/virksomhed/abonnement" className="shrink-0 text-body-sm">
          {t.seats.addSeats}
        </TextLink>
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="flex flex-col gap-4 border-b border-line px-6 py-5 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="text-[1.125rem] font-semibold text-ink lg:pb-2">{t.members.listTitle}</h2>
          <form method="get" className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap" aria-label={t.members.filters.title}>
            <div className="sm:w-48">
              <Select label={t.members.filters.track} name="spor" defaultValue={sp.spor ?? ""}>
                <option value="">{t.members.filters.all}</option>
                {tracks.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.displayName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:w-44">
              <Select label={t.members.filters.jobRole} name="jobrolle" defaultValue={sp.jobrolle ?? ""}>
                <option value="">{t.members.filters.all}</option>
                {JOB_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t.jobRoles[r]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary" icon="search" className="col-span-2 rounded-full">
              {t.members.filters.apply}
            </Button>
          </form>
        </div>
        <div className={`hidden border-b border-line px-6 py-2.5 text-caption text-ink-subtle sm:px-7 ${COLS}`} aria-hidden="true">
          <span>{t.members.employee}</span>
          <span>{c.status}</span>
          <span>{c.track}</span>
          <span className="text-right">{t.members.scoreShort}</span>
          <span>{c.passed}</span>
          <span>{c.lastActivity}</span>
          <span />
        </div>
        {page.rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="users" title={t.members.empty} />
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-line" data-testid="members">
            {page.rows.map((r) => (
              <MemberRow key={r.memberId} r={r} tracks={tracks} canChangeRole={isOwner && r.email !== ctx.user.email} />
            ))}
          </ul>
        )}
        {(sp.cursor || page.nextCursor) && (
          <nav aria-label={t.members.pagination} className="flex justify-end gap-3 border-t border-line px-6 py-3 sm:px-7">
            {sp.cursor && (
              <ButtonLink href={qs({})} variant="secondary" size="sm" icon="arrowLeft">
                {t.members.first}
              </ButtonLink>
            )}
            {page.nextCursor && (
              <ButtonLink href={qs({ cursor: page.nextCursor })} variant="secondary" size="sm" trailingIcon="arrowRight">
                {t.members.next}
              </ButtonLink>
            )}
          </nav>
        )}
      </section>

      <div id="inviter" className="scroll-mt-24">
        <Section title={t.invite.title} description={t.invite.description}>
          <ActionForm action={inviteMembers} testId="invite-form" className="flex flex-col gap-5">
            <TextArea label={t.invite.emails} name="emails" rows={4} required className="font-mono text-mono" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label={t.invite.role} name="role" defaultValue="LEARNER">
                <option value="LEARNER">{t.roles.LEARNER}</option>
                <option value="ADMIN">{t.roles.ADMIN}</option>
              </Select>
              <TrackAndRoleFields tracks={tracks} />
            </div>
            <div>
              <AdminSubmit variant="primary" icon="send">{t.invite.submit}</AdminSubmit>
            </div>
          </ActionForm>
          {pending.length > 0 && (
            <div className="-mx-6 -mb-6 mt-2 border-t border-line sm:-mx-7">
              <h3 className="bg-sunken px-6 py-2.5 sm:px-7 text-caption font-semibold tracking-[0.02em] text-ink-muted">
                {t.members.pending} <span className="tabular-nums">({pending.length})</span>
              </h3>
              <ul data-testid="pending-invitations" className="flex flex-col divide-y divide-line border-t border-line">
                {pending.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 sm:px-7">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 truncate text-body-sm text-ink">
                        <Icon name="mail" className="text-ink-muted" />
                        {p.email}
                      </span>
                      <span className="pl-6 text-caption text-ink-muted">
                        {p.role ? t.roles[p.role] : ""} {p.track ? `· ${p.track.displayName}` : ""}
                      </span>
                    </span>
                    <form action={cancelInvitation}>
                      <input type="hidden" name="invitationId" value={p.id} />
                      <AdminSubmit variant="ghost" size="sm" icon="x">
                        {t.members.cancelInvitation}
                      </AdminSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title={t.link.title}
          description={t.link.body}
          testId="join-link"
          actions={
            <Badge tone={org.joinLinkEnabled ? "success" : "neutral"} icon={org.joinLinkEnabled ? "check" : "dash"}>
              {org.joinLinkEnabled ? t.link.active : t.link.inactive}
            </Badge>
          }
        >
          <ActionForm action={createOrResetJoinLink}>
            <div className="flex flex-wrap gap-3">
              <SubmitButton variant="secondary">{org.joinLinkEnabled ? t.link.reset : t.link.enable}</SubmitButton>
            </div>
          </ActionForm>
          {org.joinLinkEnabled && (
            <ActionForm action={turnOffJoinLink}>
              <div>
                <AdminSubmit variant="ghost">{t.link.disable}</AdminSubmit>
              </div>
            </ActionForm>
          )}
        </Section>

        <Section title={t.domain.title} description={t.domain.body} testId="domain">
          {org.verifiedDomain && org.domainVerifiedAt && (
            <Notice tone="success">{format(t.domain.verified, { domain: org.verifiedDomain })}</Notice>
          )}
          {org.verifiedDomain && !org.domainVerifiedAt && org.domainVerificationToken && (
            <div className="flex flex-col gap-3 rounded-md border border-line p-4">
              <Badge tone="hint" icon="clock" className="self-start">
                {format(t.domain.pending, { domain: org.verifiedDomain })}
              </Badge>
              <p className="text-body-sm text-ink-muted">{format(t.domain.instructions, { domain: org.verifiedDomain })}</p>
              <CodeBox>{expectedTxtRecord(org.domainVerificationToken)}</CodeBox>
              <ActionForm action={checkDomain}>
                <div>
                  <SubmitButton variant="secondary">{t.domain.verify}</SubmitButton>
                </div>
              </ActionForm>
            </div>
          )}
          <ActionForm action={saveDomain} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label={t.domain.label} name="domain" required maxLength={255} />
            </div>
            <SubmitButton variant="secondary">{t.domain.save}</SubmitButton>
          </ActionForm>
          {org.verifiedDomain && (
            <ActionForm action={deleteDomain}>
              <div>
                <AdminSubmit variant="ghost" icon="trash">
                  {t.domain.remove}
                </AdminSubmit>
              </div>
            </ActionForm>
          )}
        </Section>
      </div>

      {removed.length > 0 && (
        <Section title={t.members.inactiveTitle}>
          <ul className="-mx-6 -my-6 flex flex-col divide-y divide-line sm:-mx-7">
            {removed.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 sm:px-7">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-body-sm text-ink">{m.user.name}</span>
                  <span className="text-caption text-ink-muted">
                    {m.user.email} · <span>{formatDateDa(m.deactivatedAt)}</span>
                  </span>
                </span>
                <ActionForm action={restoreMember} className="flex flex-col items-end gap-2">
                  <input type="hidden" name="memberId" value={m.id} />
                  <SubmitButton variant="secondary">{t.members.reactivate}</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

export default function MembersPage(props: PageProps<"/virksomhed/medarbejdere">) {
  const t = getMessages().orgAdmin.members;
  return (
    <AdminShell title={t.title} lead={t.lead}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<Search>} />
      </Suspense>
    </AdminShell>
  );
}
