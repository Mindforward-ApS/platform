import { SiteFooter } from "@/components/legal/site-footer";

// Sign-up + onboarding (approved preview, Marco 11 Nov 2026): full-height split screen, legal links below.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-web-bg font-site text-web-ink">
      {children}
      <SiteFooter variant="compact" />
    </div>
  );
}
