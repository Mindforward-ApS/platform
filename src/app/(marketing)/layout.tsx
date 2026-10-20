import { SiteFooter } from "@/components/legal/site-footer";
import { MarketingHeader } from "@/components/shell/marketing-header";

// Public pages (niveautest, samtykke, afmelding, juridiske sider) share the header and legal footer.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
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
