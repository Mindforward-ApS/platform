import { AppHeader } from "@/components/shell/app-header";
import { Badge } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";

// Platform owner console (GREB_ADMIN). Visually marked so it is never mistaken for the customer app.
export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const t = getMessages().shell.owner;
  const items = [
    { href: "/admin", label: t.overview, exact: true },
    { href: "/admin/indhold", label: t.content },
    { href: "/admin/forbrug", label: t.usage },
  ];
  return (
    <>
      <AppHeader items={items} home="/admin" badge={<Badge tone="hint">{t.label}</Badge>} />
      <div id="indhold" className="flex flex-1 flex-col">
        {children}
      </div>
    </>
  );
}
