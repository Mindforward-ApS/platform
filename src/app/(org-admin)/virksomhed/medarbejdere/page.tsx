import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button, Field, Notice, Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { changeMemberRole, inviteMember } from "./actions";

// Minimal M1 placeholder. The real admin UI (status, scores, link/domain invites, seats) is M7.
const ERRORS = { email: "notAllowed", medlem: "alreadyMember", ejer: "lastOwner", generel: "notAllowed" } as const;

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; ok?: string }> }) {
  const ctx = await guardPage(() => requireActiveMembership(ADMIN_ROLES), "/virksomhed/medarbejdere");
  const t = getMessages().business;
  const roleNames = getMessages().account.roles;
  const sp = await searchParams;
  const orgId = ctx.membership.organizationId;
  const org = await db().organization.findUniqueOrThrow({ where: { id: orgId }, select: { type: true } });
  if (org.type !== "BUSINESS") redirect("/konto?fejl=adgang");
  const [members, pending] = await Promise.all([
    db().membership.findMany({ where: { organizationId: orgId, deactivatedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, role: true, user: { select: { name: true, email: true } } } }),
    db().invitation.findMany({ where: { organizationId: orgId, status: "pending", expiresAt: { gt: new Date() } }, select: { id: true, email: true, role: true } }),
  ]);
  const isOwner = ctx.membership.role === "OWNER";
  const errorKey = sp.fejl && sp.fejl in ERRORS ? ERRORS[sp.fejl as keyof typeof ERRORS] : undefined;

  return (
    <>
      {errorKey && <Notice tone="error">{t.errors[errorKey]}</Notice>}
      {sp.ok && <Notice>{t.invited}</Notice>}
      <ul className="flex flex-col gap-2" data-testid="members">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
            <span>
              {m.user.name} · {m.user.email} · {roleNames[m.role]}
            </span>
            {isOwner && m.user.email !== ctx.user.email && (
              <form action={changeMemberRole} className="flex gap-1">
                <input type="hidden" name="memberId" value={m.id} />
                <select name="role" defaultValue={m.role} aria-label={t.changeRole} className="rounded-md border border-border bg-bg px-2">
                  {(["LEARNER", "ADMIN", "OWNER"] as const).map((r) => (
                    <option key={r} value={r}>
                      {roleNames[r]}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary">
                  {t.save}
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {pending.length > 0 && (
        <section>
          <h2 className="font-semibold">{t.pending}</h2>
          <ul data-testid="pending-invitations">
            {pending.map((p) => (
              <li key={p.id}>
                {p.email} · {p.role ? roleNames[p.role] : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      <form action={inviteMember} className="flex flex-col gap-3">
        <h2 className="font-semibold">{t.inviteTitle}</h2>
        <Field label={t.inviteEmail} name="email" type="email" required />
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t.inviteRole}</span>
          <select name="role" defaultValue="LEARNER" className="rounded-md border border-border bg-bg px-3 py-2">
            <option value="LEARNER">{roleNames.LEARNER}</option>
            <option value="ADMIN">{roleNames.ADMIN}</option>
          </select>
        </label>
        <Button type="submit">{t.invite}</Button>
      </form>
    </>
  );
}

export default function MembersPage(props: PageProps<"/virksomhed/medarbejdere">) {
  return (
    <Page title={getMessages().business.membersTitle}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; ok?: string }>} />
      </Suspense>
    </Page>
  );
}
