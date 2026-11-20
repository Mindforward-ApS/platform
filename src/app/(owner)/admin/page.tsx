import { Suspense } from "react";
import { LinkCard } from "@/components/admin/admin-ui";
import { Icon } from "@/components/ui/icons";
import { Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requirePlatformAdmin } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";

// GREB_ADMIN only, with TOTP verified on this session. Content review, kill switches etc. come in M9/M10.
async function Content() {
  const ctx = await guardPage(() => requirePlatformAdmin(), "/admin");
  const m = getMessages();
  const t = m.admin;
  return (
    <>
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex min-w-0 items-center gap-2 text-body-sm text-ink-muted">
        <Icon name="user" />
        {t.signedInAs}
        <span className="truncate font-medium text-ink" data-testid="admin-ok">
          {ctx.user.email}
        </span>
      </p>
      <p className="flex items-center gap-2 text-body-sm text-success">
        <Icon name="shield" />
        {t.twoFactorOn}
      </p>
    </div>
      <div className="grid gap-6 md:grid-cols-2">
        <LinkCard href="/admin/indhold" icon="file" title={m.contentEngine.admin.navLink} body={t.sections.content} cta={t.open} />
        <LinkCard href="/admin/forbrug" icon="chart" title={m.support.admin.costTitle} body={t.sections.usage} cta={t.open} />
      </div>
    </>
  );
}

export default function AdminPage() {
  const t = getMessages();
  return (
    <Page title={t.admin.title} lead={t.admin.lead} eyebrow={t.shell.owner.label} width="app">
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
