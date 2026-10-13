import { joinWithDomain } from "@/app/(auth)/deltag/[token]/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { db } from "@/server/db";
import { findDomainOrgForUser } from "@/server/orgs/invitations";
import { ActionForm } from "./action-form";

// M7 links on /konto: company overview (admins), certificates, "Mine data", and the verified-domain join offer.

export async function AccountDataLinks({ user, isBusinessAdmin }: { user: { id: string; email: string; emailVerified: boolean }; isBusinessAdmin: boolean }) {
  const t = getMessages().orgAdmin;
  const domainOrg = await findDomainOrgForUser(db(), user);
  return (
    <section className="flex flex-col gap-1" data-testid="account-data-links">
      {isBusinessAdmin && (
        <a className="underline" href="/virksomhed">
          {t.overview.title}
        </a>
      )}
      <a className="underline" href="/certifikater">
        {t.certificates.title}
      </a>
      <a className="underline" href="/konto/data">
        {t.myData.title}
      </a>
      {domainOrg && (
        <ActionForm action={joinWithDomain} testId="domain-offer">
          <p>{format(t.join.domainOffer, { organization: domainOrg.name })}</p>
          <input type="hidden" name="organizationId" value={domainOrg.id} />
          <SubmitButton variant="secondary">{t.join.button}</SubmitButton>
        </ActionForm>
      )}
    </section>
  );
}
