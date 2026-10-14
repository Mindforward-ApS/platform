import { SiteFooter } from "@/components/legal/site-footer";
import { AppHeader } from "@/components/shell/app-header";

// Signed-in learner area: one top bar, content, slim legal footer.
export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <div id="indhold" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter variant="compact" />
    </>
  );
}
