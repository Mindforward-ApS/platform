import { Inter } from "next/font/google";
import Link from "next/link";
import { SiteFooter } from "@/components/legal/site-footer";
import { SiteLogo } from "@/components/ui/brand";
import { getMessages } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

// Login, signup, invitations: same look as the website (mindforward.dk) — light-blue background, Inter,
// brain + "Forward" logo in a floating white bar. Nothing else to click away to.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.className} flex flex-1 flex-col bg-[#edf1fd] text-[#14161c]`}>
      <header className="px-4 pt-4 sm:px-6">
        <div className="mx-auto flex h-16 max-w-[920px] items-center rounded-2xl bg-white px-5 shadow-[0_10px_30px_-20px_rgba(20,22,28,.35)] sm:h-[72px] sm:px-6">
          <Link href="/" className="rounded-lg" aria-label={getMessages().brand}>
            <SiteLogo />
          </Link>
        </div>
      </header>
      <div id="indhold" className="mf-v3 flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter variant="compact" />
    </div>
  );
}
