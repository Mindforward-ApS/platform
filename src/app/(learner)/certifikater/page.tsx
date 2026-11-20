import { Suspense } from "react";
import { SharePanel } from "@/components/certificate/share-panel";
import { TransferOffers } from "@/components/certificate/transfer-offer";
import { SupportLauncher } from "@/components/support/support-widget";
import { AppIcon, Icon } from "@/components/ui/icons";
import { ButtonLink, EmptyState, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { serverEnv } from "@/lib/env";
import { formatDateDa } from "@/lib/format-date";
import { getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { listMyCertificates } from "@/server/certificates/service";
import { db } from "@/server/db";
import { togglePublicVerification } from "./actions";

// L7 Mine certifikater: list, PDF download, public verification page on/off (default off).

async function Content() {
  const ctx = await guardPage(() => requireUser(), "/certifikater");
  const m = getMessages();
  const t = m.orgAdmin.certificates;
  const a = m.account.certificates;
  const certs = await listMyCertificates(db(), ctx.user.id);
  const offers = ctx.session.activeOrganizationId ? <TransferOffers userId={ctx.user.id} organizationId={ctx.session.activeOrganizationId} /> : null;
  if (certs.length === 0) {
    return (
      <>
      {offers}
      <EmptyState
        icon="award"
        title={a.emptyTitle}
        action={
          <ButtonLink href="/moduler" variant="secondary" trailingIcon="arrowRight">
            {m.player.list.toModules}
          </ButtonLink>
        }
      >
        {t.empty}
      </EmptyState>
      </>
    );
  }
  return (
    <>
    {offers}
    <ul className="grid gap-6 lg:grid-cols-2" data-testid="certificates">
      {certs.map((c) => {
        const publicHref = `/certifikat/${c.verificationCode}`;
        return (
          <li key={c.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
            <div className="flex items-start gap-4 border-b border-line px-6 py-5">
              <AppIcon name="award" tone="coral" size="lg" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 className="text-title-3 text-ink">{c.track.displayName}</h2>
                <p className="text-body-sm text-ink-muted">{c.levelLabel}</p>
              </div>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-6 py-5 text-body-sm">
              <dt className="text-ink-muted">{a.issuedLabel}</dt>
              <dd className="text-ink">
                {formatDateDa(c.issuedAt)}
              </dd>
              <dt className="text-ink-muted">{a.organization}</dt>
              <dd className="min-w-0 break-words text-ink">{c.organization.name}</dd>
              <dt className="text-ink-muted">{a.codeLabel}</dt>
              <dd className="font-mono text-mono text-ink" data-testid="certificate-code">
                {c.verificationCode}
              </dd>
            </dl>

            <div className="mt-auto flex flex-col gap-3 border-t border-line px-6 py-5">
              <div className="flex flex-col gap-1">
                <p className="text-label text-ink">{a.publicTitle}</p>
                <p className="flex items-start gap-2 text-body-sm text-ink">
                  <Icon name={c.publicVerificationEnabled ? "check" : "lock"} className={c.publicVerificationEnabled ? "mt-0.5 shrink-0 text-success" : "mt-0.5 shrink-0 text-ink-muted"} />
                  {c.publicVerificationEnabled ? t.publicOn : t.publicOff}
                </p>
              </div>
              {c.publicVerificationEnabled && (
                <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-body-sm text-ink-muted">
                  {t.publicUrl}
                  <a className="inline-flex min-w-0 items-center gap-1 font-medium break-all text-accent underline decoration-accent/30 underline-offset-[3px] hover:text-accent-hover" href={publicHref}>
                    {`${serverEnv().APP_URL}${publicHref}`}
                  </a>
                </p>
              )}
              <p className="text-body-sm text-ink-muted">{t.publicExplain}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-sunken px-6 py-4">
              <form action={togglePublicVerification}>
                <input type="hidden" name="certificateId" value={c.id} />
                <input type="hidden" name="enabled" value={c.publicVerificationEnabled ? "0" : "1"} />
                <SubmitButton variant="secondary">{c.publicVerificationEnabled ? t.disablePublic : t.enablePublic}</SubmitButton>
              </form>
            </div>

            <div className="border-t border-line px-6 py-5">
              <SharePanel
                certificateId={c.id}
                isPublic={c.publicVerificationEnabled}
                levelLabel={c.levelLabel}
                trackName={c.track.displayName}
                issuedAt={c.issuedAt.toISOString()}
                verificationCode={c.verificationCode}
                verifyUrl={`${serverEnv().APP_URL}${publicHref}`}
                t={a.share}
              />
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}

export default function CertificatesPage() {
  const m = getMessages();
  return (
    <Page title={m.orgAdmin.certificates.title} lead={m.account.certificates.lead} width="app">
      <Suspense>
        <Content />
      </Suspense>
      <SupportLauncher t={m.support.widget} />
    </Page>
  );
}
