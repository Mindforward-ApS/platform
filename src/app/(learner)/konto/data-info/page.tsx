import { Suspense } from "react";
import { Icon } from "@/components/ui/icons";
import { Card, Page, TextLink, buttonClass } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";

// First-login information for B2B employees (docs/10 § 1.6): what the admin can see, cannot see, retention, links.

async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/konto/data-info");
  const t = getMessages().orgAdmin.firstLogin;
  const org = await db().organization.findUniqueOrThrow({ where: { id: ctx.membership.organizationId }, select: { name: true } });
  return (
    <Page title={t.title} lead={format(t.intro, { organization: org.name })}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card title={t.canSeeTitle} data-testid="admin-can-see">
          <ul className="flex flex-col gap-3">
            {t.canSee.map((line) => (
              <li key={line} className="flex items-start gap-3 text-body text-ink">
                <Icon name="check" className="mt-1 shrink-0 text-success" />
                {line}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.cannotSeeTitle} data-testid="admin-cannot-see">
          <ul className="flex flex-col gap-3">
            {t.cannotSee.map((line) => (
              <li key={line} className="flex items-start gap-3 text-body text-ink">
                <Icon name="lock" className="mt-1 shrink-0 text-ink-muted" />
                {line}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card
        title={t.retentionTitle}
        footer={
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TextLink href="/konto/data" className="text-label">
              {t.myData}
            </TextLink>
            {/* Plain POST (full navigation) so the client router never replays the pre-acknowledgement /konto redirect. */}
            <form method="post" action="/api/me/data-info">
              <button type="submit" className={buttonClass("primary", "md", "w-full sm:w-auto")}>
                {t.continue}
                <Icon name="arrowRight" />
              </button>
            </form>
          </div>
        }
      >
        <p className="flex items-start gap-3 text-body text-ink">
          <Icon name="clock" className="mt-1 shrink-0 text-ink-muted" />
          {t.retention}
        </p>
        <p className="flex items-start gap-3 text-body text-ink">
          <Icon name="shield" className="mt-1 shrink-0 text-ink-muted" />
          {t.learning}
        </p>
        <p className="border-t border-line pt-4 text-body-sm text-ink-muted">
          {t.privacyLinks} <TextLink href="/privatliv">{t.privacyLink}</TextLink>
        </p>
      </Card>
    </Page>
  );
}

export default function DataInfoPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
