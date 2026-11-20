import { SiteFooter } from "@/components/legal/site-footer";
import { BrainMark } from "@/components/ui/brand";

// Login, signup, invitations: same look as the website (mindforward.dk) — light-blue background, Inter.
// No header (Marco 20 Oct 2026): the brain from the logo sits huge and faint behind the cards instead.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-site-bg font-site text-site-ink">
      <div id="indhold" className="mf-v3 relative flex flex-1 flex-col">
        <BrainMark className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[min(140vw,1150px)] -translate-x-1/2 -translate-y-1/2 fill-site-blue opacity-[0.1]" />
        {children}
      </div>
      <SiteFooter variant="compact" />
    </div>
  );
}
