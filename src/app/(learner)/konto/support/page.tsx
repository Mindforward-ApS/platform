import Link from "next/link";
import { Suspense } from "react";
import { Page } from "@/components/ui/primitives";
import { SupportWidget } from "@/components/support/support-widget";
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
      <Link className="underline" href="/hjaelp">
        {t.widget.helpCenterLink}
      </Link>
    </>
  );
}

export default function SupportPage() {
  return (
    <Page title={getMessages().support.widget.title}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
