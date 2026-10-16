import { AppFrame } from "@/components/shell/app-sidebar";

// Signed-in learner area: sidebar frame and content panel. No legal footer in the app (Marco 16 Oct 2026): the legal
// links and cookie settings are on /konto (LegalLinksCard).
export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      {/* min-h-0 only around the sandbox page, so it can fill (not overflow) the panel under the top bar. */}
      <div className="flex flex-1 flex-col lg:has-[.mf-sandbox-page]:min-h-0">{children}</div>
    </AppFrame>
  );
}
