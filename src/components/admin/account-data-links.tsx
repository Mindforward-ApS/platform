import { joinWithDomain } from "@/app/(auth)/deltag/[token]/actions";
import { SettingsList, SettingsRow } from "@/components/account/settings";
import { Card } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { db } from "@/server/db";
import { findDomainOrgForUser } from "@/server/orgs/invitations";
import { ActionForm } from "./action-form";

// /konto settings list: company overview (admins), subscription, certificates, "Mine data", support, and the
// verified-domain join offer (M7).

export async function AccountDataLinks({ user, isBusinessAdmin }: { user: { id: string; email: string; emailVerified: boolean }; isBusinessAdmin: boolean }) {
  const m = getMessages();
  const t = m.orgAdmin;
  const a = m.account.settings;
  const domainOrg = await findDomainOrgForUser(db(), user);
  return (
    <>
      {domainOrg && (
        <Card title={t.join.button} description={format(t.join.domainOffer, { organization: domainOrg.name })}>
          <ActionForm action={joinWithDomain} testId="domain-offer" className="flex flex-col items-start gap-3">
            <input type="hidden" name="organizationId" value={domainOrg.id} />
            <SubmitButton variant="secondary">{t.join.button}</SubmitButton>
          </ActionForm>
        </Card>
      )}
      <Card title={a.title} description={a.description} padded={false} data-testid="account-data-links">
        <SettingsList label={a.title}>
          {isBusinessAdmin && <SettingsRow id="row-company" href="/virksomhed" icon="grid" label={t.overview.title} hint={a.companyHint} />}
          <SettingsRow id="row-subscription" href="/konto/abonnement" icon="card" label={m.billing.account.accountLink} hint={a.subscriptionHint} />
          <SettingsRow id="row-certificates" href="/certifikater" icon="award" label={t.certificates.title} hint={a.certificatesHint} />
          <SettingsRow id="row-data" href="/konto/data" icon="shield" label={t.myData.title} hint={a.myDataHint} />
          <SettingsRow id="row-support" href="/konto/support" icon="chat" label={m.support.widget.title} hint={a.supportHint} />
        </SettingsList>
      </Card>
    </>
  );
}
