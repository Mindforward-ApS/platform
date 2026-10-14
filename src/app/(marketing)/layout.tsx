import { SiteFooter } from "@/components/legal/site-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

// Public pages (landing, niveautest, samtykke, afmelding, juridiske sider) share the header and legal footer.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <div id="indhold" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
