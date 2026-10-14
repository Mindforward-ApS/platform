import { SiteFooter } from "@/components/legal/site-footer";
import { FocusHeader } from "@/components/shell/app-header";

// Login, signup, invitations: a quiet bar and the form, nothing else to click away to.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
