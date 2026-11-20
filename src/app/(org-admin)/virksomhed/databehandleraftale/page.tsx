import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { LegalText } from "@/components/admin/legal-text";
import { Badge, Check, Field, Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { DPA_VERSION, dpaText } from "@/server/orgs/dpa";
import { acceptDataProcessingAgreement } from "./actions";

// V8 Databehandleraftale: text (placeholder pending legal review) + OWNER acceptance before the first invitation.

async function Content() {
  const ctx = await guardPage(async () => {
    const c = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(c.membership.organizationId);
    return c;
  }, "/virksomhed/databehandleraftale");
  const t = getMessages().orgAdmin.dpa;
  const o = getMessages().orgAdmin.overview;
  const org = await db().organization.findUniqueOrThrow({ where: { id: ctx.membership.organizationId }, select: { dpaAcceptedAt: true, dpaVersion: true, cvr: true } });
  return (
    <>
      {org.dpaAcceptedAt && (
        <Notice tone="success">
          <span data-testid="dpa-accepted">{format(t.accepted, { version: org.dpaVersion ?? DPA_VERSION, date: formatDateDa(org.dpaAcceptedAt) })}</span>
        </Notice>
      )}
      <Section
        title={format(t.version, { version: DPA_VERSION })}
        actions={
          <Badge tone={org.dpaAcceptedAt ? "success" : "neutral"} icon={org.dpaAcceptedAt ? "check" : "clock"}>
            {org.dpaAcceptedAt ? o.done : o.todo}
          </Badge>
        }
      >
        <div className="-mx-6 -my-6 max-h-[28rem] overflow-y-auto px-6 py-6 sm:-mx-7 sm:px-8" tabIndex={0} role="region" aria-label={t.title}>
          <div className="max-w-read">
            <LegalText text={dpaText()} />
          </div>
        </div>
      </Section>
      {!org.dpaAcceptedAt && ctx.membership.role === "OWNER" && (
        <Section title={t.acceptTitle}>
          <ActionForm action={acceptDataProcessingAgreement} testId="dpa-form" className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.name} name="signerName" required minLength={2} maxLength={120} autoComplete="name" />
              <Field label={t.jobTitle} name="signerTitle" required minLength={2} maxLength={120} />
              <Field label={t.cvr} name="cvr" required pattern="\d{8}" inputMode="numeric" defaultValue={org.cvr ?? ""} className="tabular-nums" />
            </div>
            <div className="rounded-md border border-line bg-sunken p-4">
              <Check name="accept" required label={t.accept} />
            </div>
            <div>
              <SubmitButton>{t.submit}</SubmitButton>
            </div>
          </ActionForm>
        </Section>
      )}
      {!org.dpaAcceptedAt && ctx.membership.role !== "OWNER" && <Notice tone="hint" icon="lock">{t.ownerOnly}</Notice>}
    </>
  );
}

export default function DpaPage() {
  const t = getMessages().orgAdmin.dpa;
  return (
    <AdminShell title={t.title} lead={t.intro}>
      <Suspense>
        <Content />
      </Suspense>
    </AdminShell>
  );
}
