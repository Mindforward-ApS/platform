import Link from "next/link";
import { Suspense } from "react";
import { Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requirePlatformAdmin } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";

// GREB_ADMIN only, with TOTP verified on this session. Content review, kill switches etc. come in M9/M10.
async function Content() {
  const ctx = await guardPage(() => requirePlatformAdmin(), "/admin");
  return (
    <>
      <p data-testid="admin-ok">{ctx.user.email}</p>
      <Link href="/admin/kunder" className="underline">
        {getMessages().ownerCustomers.navLink}
      </Link>
      <Link href="/admin/indhold" className="underline">
        {getMessages().contentEngine.admin.navLink}
      </Link>
    </>
  );
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
