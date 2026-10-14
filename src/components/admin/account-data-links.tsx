import Link from "next/link";
import { joinWithDomain } from "@/app/(auth)/deltag/[token]/actions";
import { Icon, type IconName } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { db } from "@/server/db";
import { findDomainOrgForUser } from "@/server/orgs/invitations";
import { ActionForm } from "./action-form";

// M7 links on /konto: company overview (admins), certificates, "Mine data", and the verified-domain join offer.
// Renders as divided rows without its own frame, so it sits inside whatever card the account page gives it.

function Row({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <li>
      <Link href={href} className="group -mx-2 flex items-center gap-3 rounded-sm px-2 py-3 text-body text-ink transition-colors duration-[120ms] hover:bg-sunken">
        <Icon name={icon} className="text-ink-muted" />
        <span className="flex-1">{label}</span>
        <Icon name="chevronRight" className="text-ink-subtle transition-transform duration-[120ms] group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

export async function AccountDataLinks({ user, isBusinessAdmin }: { user: { id: string; email: string; emailVerified: boolean }; isBusinessAdmin: boolean }) {
  const t = getMessages().orgAdmin;
  const domainOrg = await findDomainOrgForUser(db(), user);
  return (
    <section className="flex flex-col gap-4" data-testid="account-data-links">
      <ul className="flex flex-col divide-y divide-line">
        {isBusinessAdmin && <Row href="/virksomhed" icon="grid" label={t.overview.title} />}
        <Row href="/certifikater" icon="award" label={t.certificates.title} />
        <Row href="/konto/data" icon="shield" label={t.myData.title} />
      </ul>
      {domainOrg && (
        <ActionForm action={joinWithDomain} testId="domain-offer" className="flex flex-col items-start gap-3 rounded-md border border-line bg-sunken p-4">
          <p className="text-body-sm text-ink">{format(t.join.domainOffer, { organization: domainOrg.name })}</p>
          <input type="hidden" name="organizationId" value={domainOrg.id} />
          <SubmitButton variant="secondary">{t.join.button}</SubmitButton>
        </ActionForm>
      )}
    </section>
  );
}
