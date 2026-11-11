import { AppFrame } from "@/components/shell/app-sidebar";

// Signed-in learner area: the approved platform shell (sidebar + top bar). No legal footer in the app (Marco 16 Oct
// 2026): the legal links and cookie settings are on /konto (LegalLinksCard).
export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
