import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { Markdown } from "@/components/player/markdown";
import { Field, Notice } from "@/components/ui/primitives";
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
  const org = await db().organization.findUniqueOrThrow({ where: { id: ctx.membership.organizationId }, select: { dpaAcceptedAt: true, dpaVersion: true, cvr: true } });
  return (
    <>
      <p>{t.intro}</p>
      {org.dpaAcceptedAt && (
        <Notice>
          <span data-testid="dpa-accepted">{format(t.accepted, { version: org.dpaVersion ?? DPA_VERSION, date: formatDateDa(org.dpaAcceptedAt) })}</span>
        </Notice>
      )}
      <Section title={format(t.version, { version: DPA_VERSION })}>
        <div className="max-h-96 overflow-y-auto">
          <Markdown text={dpaText()} />
        </div>
      </Section>
      {!org.dpaAcceptedAt && ctx.membership.role === "OWNER" && (
        <ActionForm action={acceptDataProcessingAgreement} testId="dpa-form">
          <Field label={t.name} name="signerName" required minLength={2} maxLength={120} autoComplete="name" />
          <Field label={t.jobTitle} name="signerTitle" required minLength={2} maxLength={120} />
          <Field label={t.cvr} name="cvr" required pattern="\d{8}" inputMode="numeric" defaultValue={org.cvr ?? ""} />
          <label className="flex items-start gap-2">
            <input type="checkbox" name="accept" required />
            <span>{t.accept}</span>
          </label>
          <SubmitButton>{t.submit}</SubmitButton>
        </ActionForm>
      )}
      {!org.dpaAcceptedAt && ctx.membership.role !== "OWNER" && <Notice>{t.ownerOnly}</Notice>}
    </>
  );
}

export default function DpaPage() {
  return (
    <AdminShell title={getMessages().orgAdmin.dpa.title}>
      <Suspense>
        <Content />
      </Suspense>
    </AdminShell>
  );
}
