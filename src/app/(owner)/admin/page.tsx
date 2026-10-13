import { Suspense } from "react";
import { Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requirePlatformAdmin } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";

// GREB_ADMIN only, with TOTP verified on this session. Content review, kill switches etc. come in M9/M10.
async function Content() {
  const ctx = await guardPage(() => requirePlatformAdmin(), "/admin");
  return <p data-testid="admin-ok">{ctx.user.email}</p>;
}

export default function AdminPage() {
  return (
    <Page title={getMessages().admin.title}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
