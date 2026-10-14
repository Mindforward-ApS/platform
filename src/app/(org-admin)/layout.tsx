import { SiteFooter } from "@/components/legal/site-footer";
import { AppFrame, companyGroup, learnerGroups } from "@/components/shell/app-sidebar";

// Company admin: the learner sidebar plus a "Virksomhed" group with the admin pages.
export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame groups={[...learnerGroups(), companyGroup()]}>
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter variant="compact" />
    </AppFrame>
  );
}
