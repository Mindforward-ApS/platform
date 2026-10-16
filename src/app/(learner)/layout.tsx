import { AppFrame } from "@/components/shell/app-sidebar";

// Signed-in learner area: sidebar frame and content panel. No legal footer in the app (Marco 16 Oct 2026): the legal
// links and cookie settings are on /konto (LegalLinksCard).
export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      <div className="flex flex-1 flex-col">{children}</div>
    </AppFrame>
  );
}
