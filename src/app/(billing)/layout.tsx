import { SiteFooter } from "@/components/legal/site-footer";
import { FocusHeader } from "@/components/shell/app-header";

// Checkout and withdrawal flows: a quiet bar so the legal steps get full attention.
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FocusHeader />
      <div id="indhold" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter variant="compact" />
    </>
  );
}
