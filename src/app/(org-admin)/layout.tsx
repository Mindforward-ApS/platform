import { SiteFooter } from "@/components/legal/site-footer";
import { AppHeader, learnerNav } from "@/components/shell/app-header";
import { getMessages } from "@/lib/i18n";

// Company admin: the learner bar plus a "Virksomhed" entry; pages add the sidebar via AdminShell.
export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const items = [...learnerNav(), { href: "/virksomhed", label: getMessages().shell.learner.company }];
  return (
    <>
      <AppHeader items={items} home="/virksomhed" />
      <div id="indhold" className="flex flex-1 flex-col">
        {children}
      </div>
      <SiteFooter variant="compact" />
    </>
  );
}
