import { AppIcon } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { pendingTransferOffers } from "@/server/certificates/transfer";
import { db } from "@/server/db";
import { decideCredentialTransfer } from "@/app/(learner)/certifikater/actions";

// "Tag dine resultater med": shown in the active account when the learner has passed modules or certificates in
// another of their own accounts and has not decided yet. Nothing is shared until they say yes (docs/01 § 4.5).

function count(one: string, many: string, n: number) {
  return n === 1 ? one : format(many, { count: n });
}

export async function TransferOffers({ userId, organizationId }: { userId: string; organizationId: string }) {
  const [offers, to] = await Promise.all([
    pendingTransferOffers(db(), userId, organizationId),
    db().organization.findUnique({ where: { id: organizationId }, select: { name: true, type: true } }),
  ]);
  if (!to || offers.length === 0) return null;
  const t = getMessages().account.certificates.transfer;
  const toBusiness = to.type === "BUSINESS";
  return (
    <div className="flex flex-col gap-4">
      {offers.map((o) => {
        const from = o.fromType === "PERSONAL" ? t.fromPersonal : o.fromName;
        const modules = count(t.modulesOne, t.modulesMany, o.modules);
        const certificates = o.certificates === 0 ? t.certificatesNone : count(t.certificatesOne, t.certificatesMany, o.certificates);
        return (
          <section key={o.fromOrganizationId} className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:items-start" data-testid="transfer-offer">
            <AppIcon name="award" tone="coral" size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-overline text-ink-subtle uppercase">{t.eyebrow}</p>
                <h2 className="text-title-3 text-ink">{toBusiness ? format(t.titleToBusiness, { to: to.name }) : format(t.titleToPersonal, { from })}</h2>
              </div>
              <p className="text-body text-ink-muted">{format(t.body, { from, modules, certificates })}</p>
              <ul className="flex flex-col gap-1.5 text-body-sm text-ink-muted">
                <li>{toBusiness ? format(t.employerNote, { to: to.name }) : t.personalNote}</li>
                {o.certificates > 0 && <li>{t.sameCertificate}</li>}
              </ul>
              <form action={decideCredentialTransfer} className="flex flex-wrap items-center gap-3 pt-1">
                <input type="hidden" name="fromOrganizationId" value={o.fromOrganizationId} />
                <SubmitButton name="decision" value="accept" icon="check">
                  {t.accept}
                </SubmitButton>
                <SubmitButton name="decision" value="decline" variant="ghost">
                  {t.decline}
                </SubmitButton>
                <span className="text-caption text-ink-subtle">{t.once}</span>
              </form>
            </div>
          </section>
        );
      })}
    </div>
  );
}
