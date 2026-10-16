import Link from "next/link";
import { SiteFooter } from "@/components/legal/site-footer";
import { AppWordmark } from "@/components/ui/brand";
import { getMessages } from "@/lib/i18n";

// Login, signup, invitations (design v3): a quiet bar with the wordmark and the form, nothing else to click away to.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-app items-center px-4 sm:px-6">
          <Link href="/" className="rounded-sm" aria-label={getMessages().brand}>
            <AppWordmark size={19} />
          </Link>
        </div>
      </header>
      <div id="indhold" className="mf-v3 flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter variant="compact" />
    </>
  );
}
