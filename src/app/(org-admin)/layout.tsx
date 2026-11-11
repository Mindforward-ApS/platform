import { AppFrame } from "@/components/shell/app-sidebar";

// Company admin: the same platform shell; the sidebar shows "Mit hold" and "Virksomhed" to company admins.
export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
