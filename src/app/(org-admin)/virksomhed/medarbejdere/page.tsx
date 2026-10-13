import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { Field, Notice } from "@/components/ui/primitives";
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

// V3 Medarbejdere: status, best score, dates, certificates per employee (never answers or prompts), invitations by
// email/CSV, link and verified domain, track/job-role assignment, remove (frees the seat), seats used/limit.

const JOB_ROLES = ["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS", "OTHER"] as const;
const select = "rounded-md border border-border bg-bg px-2 py-1";

type Search = { cursor?: string; spor?: string; jobrolle?: string; fejl?: string };

function TrackAndRoleFields({ tracks, row }: { tracks: { id: string; displayName: string; licenseTiers: string[] }[]; row?: EmployeeRow }) {
  const t = getMessages().orgAdmin;
  const current = row?.tracks[0];
  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        {t.members.assign.track}
        <select name="trackId" defaultValue={current?.id ?? ""} className={select}>
          <option value="">{t.members.assign.noTrack}</option>
          {tracks.map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t.members.assign.tier}
        <select name="licenseTier" defaultValue={current?.licenseTier ?? ""} className={select}>
          <option value="">—</option>
          {(["COPILOT_CHAT", "COPILOT_M365", "UNKNOWN"] as const).map((tier) => (
            <option key={tier} value={tier}>
              {t.tiers[tier]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t.members.assign.jobRole}
        <select name="jobRole" defaultValue={row?.jobRole ?? ""} className={select}>
          <option value="">{t.members.assign.noJobRole}</option>
          {JOB_ROLES.map((r) => (
            <option key={r} value={r}>
              {t.jobRoles[r]}
            </option>
          ))}
        </select>
      </label>
    </>
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

  return (
    <>
      {sp.fejl === "ejer" && <Notice tone="error">{t.errors.lastOwner}</Notice>}
      {!org.dpaAcceptedAt && (
        <Notice tone="error">
          {t.invite.dpaRequired}{" "}
          <a className="underline" href="/virksomhed/databehandleraftale">
            {t.nav.dpa}
          </a>
        </Notice>
      )}
      <p data-testid="seat-usage">
        {format(t.seats.usage, { used, limit: ent.seatLimit })} ·{" "}
        <a className="underline" href="/virksomhed/abonnement">
          {t.seats.addSeats}
        </a>
      </p>

      <form method="get" className="flex flex-wrap items-end gap-2" aria-label={t.members.filters.title}>
        <label className="flex flex-col gap-1 text-sm">
          {t.members.filters.track}
          <select name="spor" defaultValue={sp.spor ?? ""} className={select}>
            <option value="">{t.members.filters.all}</option>
            {tracks.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t.members.filters.jobRole}
          <select name="jobrolle" defaultValue={sp.jobrolle ?? ""} className={select}>
            <option value="">{t.members.filters.all}</option>
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {t.jobRoles[r]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-border bg-surface px-3 py-1">
          {t.members.filters.apply}
        </button>
      </form>

      {page.rows.length === 0 && <p>{t.members.empty}</p>}
      <ul className="flex flex-col gap-3" data-testid="members">
        {page.rows.map((r) => (
          <li key={r.memberId} className="flex flex-col gap-2 rounded-md border border-border p-3" data-testid="member-row">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong>{r.name || r.email}</strong>
              <span className="text-sm">{r.email}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <dt>{t.members.columns.role}</dt>
              <dd>{t.roles[r.role]}</dd>
              <dt>{t.members.columns.status}</dt>
              <dd data-testid="member-status">{t.members.status[r.status]}</dd>
              <dt>{t.members.columns.track}</dt>
              <dd>{r.tracks.map((x) => x.name).join(", ") || t.members.none}</dd>
              <dt>{t.members.columns.jobRole}</dt>
              <dd>{r.jobRole ? t.jobRoles[r.jobRole] : t.members.none}</dd>
              <dt>{t.members.columns.score}</dt>
              <dd>{r.avgBestScorePct === null ? t.members.none : `${r.avgBestScorePct} %`}</dd>
              <dt>{t.members.columns.passed}</dt>
              <dd>{r.passedCount}</dd>
              <dt>{t.members.columns.passedAt}</dt>
              <dd>{formatDateDa(r.lastPassedAt) || t.members.none}</dd>
              <dt>{t.members.columns.certificates}</dt>
              <dd>{r.certificates.map((c) => `${c.trackName} · ${c.levelLabel}`).join(", ") || t.members.none}</dd>
              <dt>{t.members.columns.lastActivity}</dt>
              <dd>{formatDateDa(r.lastActivityAt) || t.members.none}</dd>
            </dl>
            <a className="text-sm underline" href={`/virksomhed/medarbejdere/${r.memberId}`}>
              {t.members.details}
            </a>
            <details>
              <summary className="cursor-pointer text-sm">{t.members.assign.title}</summary>
              <ActionForm action={assignMember} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="memberId" value={r.memberId} />
                <TrackAndRoleFields tracks={tracks} row={r} />
                <SubmitButton variant="secondary">{t.members.assign.save}</SubmitButton>
              </ActionForm>
              {isOwner && r.email !== ctx.user.email && (
                <form action={changeMemberRole} className="mt-2 flex items-end gap-2">
                  <input type="hidden" name="memberId" value={r.memberId} />
                  <label className="flex flex-col gap-1 text-sm">
                    {t.members.changeRole}
                    <select name="role" defaultValue={r.role} className={select}>
                      {(["LEARNER", "ADMIN", "OWNER"] as const).map((role) => (
                        <option key={role} value={role}>
                          {t.roles[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <SubmitButton variant="secondary">{t.members.save}</SubmitButton>
                </form>
              )}
              {r.role !== "OWNER" && (
                <ActionForm action={removeMember} className="mt-2">
                  <input type="hidden" name="memberId" value={r.memberId} />
                  <SubmitButton variant="secondary">{t.members.deactivate}</SubmitButton>
                </ActionForm>
              )}
            </details>
          </li>
        ))}
      </ul>
      <div className="flex gap-3 text-sm">
        {sp.cursor && (
          <a className="underline" href={qs({})}>
            {t.members.first}
          </a>
        )}
        {page.nextCursor && (
          <a className="underline" href={qs({ cursor: page.nextCursor })}>
            {t.members.next}
          </a>
        )}
      </div>

      <Section title={t.invite.title}>
        <ActionForm action={inviteMembers} testId="invite-form">
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t.invite.emails}</span>
            <textarea name="emails" rows={4} required className="rounded-md border border-border bg-bg px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t.invite.role}
            <select name="role" defaultValue="LEARNER" className={select}>
              <option value="LEARNER">{t.roles.LEARNER}</option>
              <option value="ADMIN">{t.roles.ADMIN}</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <TrackAndRoleFields tracks={tracks} />
          </div>
          <SubmitButton>{t.invite.submit}</SubmitButton>
        </ActionForm>
        {pending.length > 0 && (
          <>
            <h3 className="font-semibold">{t.members.pending}</h3>
            <ul data-testid="pending-invitations" className="flex flex-col gap-1">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span>
                    {p.email} · {p.role ? t.roles[p.role] : ""} {p.track ? `· ${p.track.displayName}` : ""}
                  </span>
                  <form action={cancelInvitation}>
                    <input type="hidden" name="invitationId" value={p.id} />
                    <SubmitButton variant="secondary">{t.members.cancelInvitation}</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section title={t.link.title} testId="join-link">
        <p className="text-sm">{t.link.body}</p>
        <p className="text-sm">{org.joinLinkEnabled ? t.link.active : t.link.inactive}</p>
        <ActionForm action={createOrResetJoinLink}>
          <SubmitButton variant="secondary">{org.joinLinkEnabled ? t.link.reset : t.link.enable}</SubmitButton>
        </ActionForm>
        {org.joinLinkEnabled && (
          <ActionForm action={turnOffJoinLink}>
            <SubmitButton variant="secondary">{t.link.disable}</SubmitButton>
          </ActionForm>
        )}
      </Section>

      <Section title={t.domain.title} testId="domain">
        <p className="text-sm">{t.domain.body}</p>
        {org.verifiedDomain && org.domainVerifiedAt && <p>{format(t.domain.verified, { domain: org.verifiedDomain })}</p>}
        {org.verifiedDomain && !org.domainVerifiedAt && org.domainVerificationToken && (
          <>
            <p>{format(t.domain.pending, { domain: org.verifiedDomain })}</p>
            <p className="text-sm">{format(t.domain.instructions, { domain: org.verifiedDomain })}</p>
            <code className="break-all">{expectedTxtRecord(org.domainVerificationToken)}</code>
            <ActionForm action={checkDomain}>
              <SubmitButton variant="secondary">{t.domain.verify}</SubmitButton>
            </ActionForm>
          </>
        )}
        <ActionForm action={saveDomain}>
          <Field label={t.domain.label} name="domain" required maxLength={255} />
          <SubmitButton variant="secondary">{t.domain.save}</SubmitButton>
        </ActionForm>
        {org.verifiedDomain && (
          <ActionForm action={deleteDomain}>
            <SubmitButton variant="secondary">{t.domain.remove}</SubmitButton>
          </ActionForm>
        )}
      </Section>

      {removed.length > 0 && (
        <Section title={t.members.inactiveTitle}>
          <ul className="flex flex-col gap-1">
            {removed.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span>
                  {m.user.name} · {m.user.email} · {formatDateDa(m.deactivatedAt)}
                </span>
                <ActionForm action={restoreMember}>
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
  return (
    <AdminShell title={getMessages().orgAdmin.members.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<Search>} />
      </Suspense>
    </AdminShell>
  );
}
