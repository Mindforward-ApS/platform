import { SiteFooter } from "@/components/legal/site-footer";
import { AppFrame } from "@/components/shell/app-sidebar";

// Signed-in learner area: sidebar frame, content panel, slim legal footer at the bottom of the panel.
export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter variant="compact" />
    </AppFrame>
  );
}
