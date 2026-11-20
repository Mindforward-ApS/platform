import { Suspense } from "react";
import { SiteFooter } from "@/components/legal/site-footer";
import { AppFrame } from "@/components/shell/app-sidebar";
import { MarketingHeader } from "@/components/shell/marketing-header";
import { getAuthContext } from "@/server/auth/authz";

// Pages that are both public and part of the app (niveautest, hjælp). Signed in, they open inside the app frame with
// the sidebar, like every other app page (Marco 26 Oct 2026: "har stadig det gamle design … åbner i en helt ny fane");
// signed out, they keep the public header and legal footer. The session is runtime data, so it is read in <Suspense>.
async function Frame({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (ctx)
    return (
      <AppFrame>{children}</AppFrame>
    );
  return (
    <div className="flex flex-1 flex-col bg-site-bg font-site text-site-ink">
      <MarketingHeader />
      <div id="indhold" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <Frame>{children}</Frame>
    </Suspense>
  );
}
