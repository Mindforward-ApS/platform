import { SiteFooter } from "@/components/legal/site-footer";

// Public pages (landing, niveautest, samtykke, afmelding, juridiske sider) share the legal footer.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
