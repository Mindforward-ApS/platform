import { Suspense } from "react";
import { SettingsList, SettingsRow } from "@/components/account/settings";
import { SupportWidget } from "@/components/support/support-widget";
import { Card, Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";

// In-app support (docs/08 § 1): logged in only. The public help center (/hjaelp) has articles only.
async function Content() {
  await guardPage(() => requireUser(), "/konto/support");
  const t = getMessages().support;
  return (
    <>
      <SupportWidget t={t.widget} />
      <Card padded={false}>
        <SettingsList>
          <SettingsRow id="row-help" href="/hjaelp" icon="help" label={t.widget.helpCenterLink} hint={t.widget.helpCenterBody} />
        </SettingsList>
      </Card>
    </>
  );
}

export default function SupportPage() {
  const t = getMessages().support.widget;
  return (
    <Page title={t.title} lead={t.pageLead}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
